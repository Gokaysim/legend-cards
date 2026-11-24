import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  getDoc,
  limit,
  orderBy,
  query,
  type Query,
  runTransaction,
  serverTimestamp,
  type Transaction,
  writeBatch,
} from 'firebase/firestore'

import { CHARACTERS_COLLECTION } from '@/features/characters/schema'
import type { AlsoWrite } from '@/features/dice/api'
import { emptyCounts, onePart } from '@/features/dice/formula'
import type { RollRequest } from '@/features/dice/diceContext'
import { firebaseCode } from '@/lib/firestore/errors'

import { CombatChangedError, CombatOpenError } from './errors'
import { groupLabel, type NpcGroup, npcNames } from './npcs'
import {
  delayTurn,
  moveItem,
  nextTurn,
  previousTurn,
  type SeenTurn,
  turnAfterRemoval,
  turnAfterReorder,
} from './order'
import {
  type Combat,
  type Combatant,
  type CombatChange,
  combatChangeConverter,
  combatantConverter,
  combatConverter,
  COMBAT_CHANGES_COLLECTION,
  COMBAT_LIMITS,
  COMBATANTS_COLLECTION,
  DM_COMBATANTS_COLLECTION,
  type DmCombatant,
  dmCombatantConverter,
  IDLE_COMBAT,
  type StoredCombatant,
} from './schema'

export function combatRef(db: Firestore): DocumentReference<Combat> {
  return doc(db, 'combat', 'main').withConverter(combatConverter)
}

export function combatantsRef(db: Firestore): CollectionReference<Combatant> {
  return collection(db, COMBATANTS_COLLECTION).withConverter(combatantConverter)
}

export function dmCombatantsRef(db: Firestore): CollectionReference<DmCombatant> {
  return collection(db, DM_COMBATANTS_COLLECTION).withConverter(dmCombatantConverter)
}

export function combatChangesRef(db: Firestore): CollectionReference<CombatChange> {
  return collection(db, COMBAT_CHANGES_COLLECTION).withConverter(combatChangeConverter)
}

/** The `count` newest fight records, newest first: one of the İşlem Logu's sources. */
export function recentCombatChangesQuery(db: Firestore, count: number): Query<CombatChange> {
  return query(combatChangesRef(db), orderBy('at', 'desc'), limit(count))
}

function rawCombatant(db: Firestore, id: string) {
  return doc(db, COMBATANTS_COLLECTION, id)
}

function rawDmCombatant(db: Firestore, id: string) {
  return doc(db, DM_COMBATANTS_COLLECTION, id)
}

/** A table character joining a combat. */
export type JoiningCharacter = { characterId: string; uid: string }

/** The NPCs of one group, created and still to be rolled, with their IDs in the group's order. */
export type CreatedNpcGroup = { ids: string[]; names: string[]; modifier: number }

type CombatantDraft = Pick<StoredCombatant, 'kind' | 'characterId' | 'uid' | 'name'>

function characterDraft(character: JoiningCharacter): CombatantDraft {
  return { kind: 'character', characterId: character.characterId, uid: character.uid, name: null }
}

function npcDrafts(group: NpcGroup, dmUid: string): CombatantDraft[] {
  return npcNames(group.name, group.count).map((name) => ({
    kind: 'npc',
    characterId: null,
    uid: dmUid,
    name,
  }))
}

function countOf(characters: readonly JoiningCharacter[], groups: readonly NpcGroup[]): number {
  return characters.length + groups.reduce((sum, group) => sum + group.count, 0)
}

/**
 * A combatant to create, with its ID and join number fixed before anything is written, so the join order does not
 * depend on which write carries it (design D2 of open-large-combats). `joining` is set for a character.
 */
type PlannedCombatant = {
  id: string
  seq: number
  draft: CombatantDraft
  joining: JoiningCharacter | null
}

function plannedCharacters(
  db: Firestore,
  characters: readonly JoiningCharacter[],
  firstSeq: number,
): PlannedCombatant[] {
  return characters.map((joining, index) => ({
    id: newId(db),
    seq: firstSeq + index,
    draft: characterDraft(joining),
    joining,
  }))
}

function plannedNpcs(
  db: Firestore,
  group: NpcGroup,
  dmUid: string,
  firstSeq: number,
): PlannedCombatant[] {
  return npcDrafts(group, dmUid).map((draft, index) => ({
    id: newId(db),
    seq: firstSeq + index,
    draft,
    joining: null,
  }))
}

/**
 * Splits `planned` into consecutive slices with at most `COMBAT_LIMITS.charactersPerWrite` characters each; NPCs ride
 * in the slice they fall into (design D1 and D2 of open-large-combats). Always returns at least one slice.
 */
function characterSlices(planned: readonly PlannedCombatant[]): PlannedCombatant[][] {
  const slices: PlannedCombatant[][] = [[]]
  let characters = 0
  for (const item of planned) {
    if (item.joining !== null && characters === COMBAT_LIMITS.charactersPerWrite) {
      slices.push([])
      characters = 0
    }
    slices[slices.length - 1]?.push(item)
    if (item.joining !== null) characters++
  }
  return slices
}

/** The characters of `slices`, in order: the ones left out when the first of them failed. */
function charactersOf(slices: readonly PlannedCombatant[][]): JoiningCharacter[] {
  return slices.flat().flatMap((item) => (item.joining === null ? [] : [item.joining]))
}

function writeCombatant(
  transaction: Transaction,
  db: Firestore,
  combatId: string,
  item: PlannedCombatant,
  manual: boolean,
): void {
  transaction.set(rawCombatant(db, item.id), {
    ...item.draft,
    combatId,
    seq: item.seq,
    manual,
    rolled: false,
    roll: null,
  })
}

/**
 * "Modifier iste" (design D6 of add-initiative-tracker, D1 to D3 of open-large-combats): opens a combat from idle
 * with the chosen characters and NPCs, none of them rolled. The first write opens the combat with the first group of
 * characters and every NPC; each later write adds the next group of characters while the combat is still the same
 * and gathering. Returns the NPC groups for their roll, and the characters left out when a later write failed.
 * Throws when the first write fails, `CombatOpenError` when a combat is already open.
 */
export async function openCombat(
  db: Firestore,
  input: { by: string; characters: readonly JoiningCharacter[]; npcGroups: readonly NpcGroup[] },
): Promise<{ combatId: string; npcGroups: CreatedNpcGroup[]; leftOut: JoiningCharacter[] }> {
  const total = countOf(input.characters, input.npcGroups)
  if (total === 0) throw new Error('A combat needs a combatant')
  if (total > COMBAT_LIMITS.combatants) throw new Error('Too many combatants')
  const combatId = newId(db)

  const [first = [], ...later] = characterSlices(plannedCharacters(db, input.characters, 0))
  let seq = input.characters.length
  const npcs = input.npcGroups.map((group) => {
    const planned = plannedNpcs(db, group, input.by, seq)
    seq += planned.length
    return { planned, modifier: group.modifier }
  })

  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'idle') throw new CombatOpenError()
    transaction.set(doc(db, 'combat', 'main'), {
      ...IDLE_COMBAT,
      phase: 'gathering',
      combatId,
      askedAt: serverTimestamp(),
      changeId: current.changeId,
    })
    for (const item of first) writeCombatant(transaction, db, combatId, item, false)
    for (const { planned } of npcs) {
      for (const item of planned) writeCombatant(transaction, db, combatId, item, false)
    }
  })

  const npcGroups = npcs.map(({ planned, modifier }) => ({
    ids: planned.map((item) => item.id),
    names: planned.map((item) => item.draft.name ?? ''),
    modifier,
  }))
  for (const [index, slice] of later.entries()) {
    try {
      await runTransaction(db, async (transaction) => {
        const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
        if (current.phase !== 'gathering' || current.combatId !== combatId) {
          throw new CombatChangedError()
        }
        for (const item of slice) writeCombatant(transaction, db, combatId, item, false)
      })
    } catch {
      return { combatId, npcGroups, leftOut: charactersOf(later.slice(index)) }
    }
  }
  return { combatId, npcGroups, leftOut: [] }
}

function newId(db: Firestore): string {
  return doc(collection(db, COMBATANTS_COLLECTION)).id
}

/** The roll of one character's initiative (design D3): 1d20 plus the modifier, in the channel. */
export function initiativeRequest(characterName: string, modifier: number): RollRequest {
  return {
    parts: [onePart({ ...emptyCounts(), d20: 1 }, modifier)],
    mode: 'normal',
    note: `İnisiyatif · ${characterName}`,
    hidden: false,
  }
}

/** The writes that go with a character's roll: its combatant's roll, and the character's modifier (design D3). */
export function initiativeWrites(
  db: Firestore,
  combatant: Pick<Combatant, 'id' | 'characterId'>,
  modifier: number,
): AlsoWrite {
  return (batch, rollId, values) => {
    batch.update(rawCombatant(db, combatant.id), {
      rolled: true,
      roll: { rollId, die: values[0] ?? 1, modifier },
    })
    if (combatant.characterId !== null) {
      batch.update(doc(db, CHARACTERS_COLLECTION, combatant.characterId), {
        initiativeModifier: modifier,
      })
    }
  }
}

/** The hidden roll of an NPC group (design D4): one d20 per NPC, with the group's modifier. */
export function npcGroupRequest(group: CreatedNpcGroup): RollRequest {
  return {
    parts: [onePart({ ...emptyCounts(), d20: group.ids.length }, group.modifier)],
    mode: 'normal',
    note: `İnisiyatif · ${groupLabel(group.names)}`,
    hidden: true,
  }
}

/**
 * The writes that go with an NPC group's hidden roll (design D4): die `i` is copy `i`'s, in its DM record, and each
 * copy is marked rolled. With `create`, the copies are created in the same batch (NPCs added while gathering).
 */
export function npcGroupWrites(
  db: Firestore,
  group: CreatedNpcGroup,
  combatId: string,
  create?: { dmUid: string; firstSeq: number },
): AlsoWrite {
  return (batch, rollId, values) => {
    group.ids.forEach((id, index) => {
      batch.set(rawDmCombatant(db, id), {
        combatId,
        rollId,
        die: values[index] ?? 1,
        modifier: group.modifier,
      })
      if (create) {
        batch.set(rawCombatant(db, id), {
          kind: 'npc',
          characterId: null,
          uid: create.dmUid,
          name: group.names[index] ?? '',
          combatId,
          seq: create.firstSeq + index,
          manual: false,
          rolled: true,
          roll: null,
        })
      } else {
        batch.update(rawCombatant(db, id), { rolled: true })
      }
    })
  }
}

/** New IDs and names for an NPC group added later. */
export function prepareNpcGroup(db: Firestore, group: NpcGroup): CreatedNpcGroup {
  const names = npcNames(group.name, group.count)
  return { ids: names.map(() => newId(db)), names, modifier: group.modifier }
}

/** "Yeniden attır": clears a roll while gathering; an NPC's DM record goes too. */
export function clearRoll(db: Firestore, combatant: Pick<Combatant, 'id' | 'kind'>): Promise<void> {
  const batch = writeBatch(db)
  batch.update(rawCombatant(db, combatant.id), { rolled: false, roll: null })
  if (combatant.kind === 'npc') batch.delete(rawDmCombatant(db, combatant.id))
  return batch.commit()
}

/** "Başlat" (design D6): fixes the order, starts round 1 at the first place, and records the start. */
export async function startFight(
  db: Firestore,
  input: { by: string; combatId: string; order: readonly string[] },
): Promise<void> {
  const changeRef = doc(collection(db, COMBAT_CHANGES_COLLECTION))
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'gathering' || current.combatId !== input.combatId) {
      throw new CombatChangedError()
    }
    transaction.update(doc(db, 'combat', 'main'), {
      phase: 'running',
      order: [...input.order],
      turn: 0,
      round: 1,
      turnAt: serverTimestamp(),
      changeId: changeRef.id,
    })
    transaction.set(changeRef, {
      by: input.by,
      at: serverTimestamp(),
      step: 'start',
      count: input.order.length,
    })
  })
}

/**
 * "Sıradaki" or "Geri" as the DM (design D5), from the turn the DM saw. When the turn has moved since, nothing
 * changes, so a double press steps only once.
 */
export async function stepTurn(
  db: Firestore,
  direction: 'next' | 'back',
  seen: SeenTurn,
): Promise<void> {
  await droppedWhenMoved(db, seen, () => stepTurnFrom(db, direction, seen))
}

async function stepTurnFrom(
  db: Firestore,
  direction: 'next' | 'back',
  seen: SeenTurn,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'running' || !sameTurn(current, seen)) return
    const length = current.order.length
    const next = direction === 'next' ? nextTurn(current, length) : previousTurn(current, length)
    if (next.turn === current.turn && next.round === current.round) return
    transaction.update(doc(db, 'combat', 'main'), {
      turn: next.turn,
      round: next.round,
      turnAt: serverTimestamp(),
    })
  })
}

/**
 * "Turumu bitirdim" (design D5): one place on, from the turn the player saw, only while the active combatant is
 * their own character. Anything else is dropped silently: the turn has moved on already.
 */
export async function endMyTurn(db: Firestore, uid: string, seen: SeenTurn): Promise<void> {
  await droppedWhenMoved(db, seen, () => endMyTurnFrom(db, uid, seen))
}

/**
 * "Turumu beklet" (design D4 of delay-own-turn): the player's active character swaps places with the next combatant,
 * which becomes active, from the turn the player saw. Dropped silently when the turn has moved on already, or when
 * there is no one to delay behind.
 */
export async function delayMyTurn(db: Firestore, uid: string, seen: SeenTurn): Promise<void> {
  await droppedWhenMoved(db, seen, () => delayMyTurnFrom(db, uid, seen))
}

/**
 * Runs a turn step, and drops it silently when the server refused it because the turn moved on meanwhile: the rules
 * judge the step against the newer turn before the transaction could retry (design D5).
 */
async function droppedWhenMoved(
  db: Firestore,
  seen: SeenTurn,
  step: () => Promise<void>,
): Promise<void> {
  try {
    await step()
  } catch (error) {
    if (firebaseCode(error) !== 'permission-denied') throw error
    const current = (await getDoc(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase === 'running' && sameTurn(current, seen)) throw error
  }
}

async function endMyTurnFrom(db: Firestore, uid: string, seen: SeenTurn): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'running' || !sameTurn(current, seen)) return
    const activeId = current.order[current.turn]
    if (activeId === undefined) return
    const active = (await transaction.get(doc(combatantsRef(db), activeId))).data()
    if (!active || active.kind !== 'character' || active.uid !== uid) return
    const next = nextTurn(current, current.order.length)
    transaction.update(doc(db, 'combat', 'main'), {
      turn: next.turn,
      round: next.round,
      turnAt: serverTimestamp(),
    })
  })
}

async function delayMyTurnFrom(db: Firestore, uid: string, seen: SeenTurn): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'running' || !sameTurn(current, seen) || current.order.length < 2) return
    const activeId = current.order[current.turn]
    if (activeId === undefined) return
    const active = (await transaction.get(doc(combatantsRef(db), activeId))).data()
    if (!active || active.kind !== 'character' || active.uid !== uid) return
    const next = delayTurn(current.order, current)
    transaction.update(doc(db, 'combat', 'main'), {
      order: next.order,
      turn: next.turn,
      round: next.round,
      turnAt: serverTimestamp(),
    })
  })
}

/** Whether the stored combat is still at the turn the user saw, with the same combatant active (design D3). */
function sameTurn(current: Combat, seen: SeenTurn): boolean {
  return (
    current.turn === seen.turn &&
    current.round === seen.round &&
    (current.order[current.turn] ?? null) === seen.activeId
  )
}

/** Drags a combatant to a new place (design D5); the active combatant stays active. */
export async function moveCombatant(db: Firestore, id: string, toIndex: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase !== 'running') throw new CombatChangedError()
    const from = current.order.indexOf(id)
    if (from < 0) throw new CombatChangedError()
    const to = Math.max(0, Math.min(toIndex, current.order.length - 1))
    if (from === to) return
    const order = moveItem(current.order, from, to)
    transaction.update(doc(db, 'combat', 'main'), {
      order,
      turn: turnAfterReorder(current.order, order, current.turn),
    })
  })
}

/** The phase `addCombatants` found in its first write, and its slices (design D2 of open-large-combats). */
type AddPlan = { phase: 'gathering' | 'running'; slices: PlannedCombatant[][] }

/**
 * Adds combatants after the setup (spec: "Adding during the fight"). While gathering, characters join without a roll
 * and NPC groups are returned for their roll, which creates them; while the fight runs, everyone joins last, by hand,
 * without a roll, in the order given. The characters are written in groups (design D1 and D2 of open-large-combats):
 * each write checks that the combat is the same and in the same phase, and while the fight runs appends exactly its
 * own combatants to the order. Returns the characters left out when a write after the first failed; throws when the
 * first write fails.
 */
export async function addCombatants(
  db: Firestore,
  input: {
    by: string
    combatId: string
    firstSeq: number
    characters: readonly JoiningCharacter[]
    npcGroups: readonly NpcGroup[]
  },
): Promise<{ npcGroups: CreatedNpcGroup[]; leftOut: JoiningCharacter[] }> {
  const characters = plannedCharacters(db, input.characters, input.firstSeq)
  let seq = input.firstSeq + characters.length
  const npcs = input.npcGroups.flatMap((group) => {
    const planned = plannedNpcs(db, group, input.by, seq)
    seq += planned.length
    return planned
  })
  const step = (index: number, fixed: AddPlan | null) =>
    runTransaction(db, async (transaction): Promise<AddPlan> => {
      const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
      if (
        current.phase === 'idle' ||
        current.combatId !== input.combatId ||
        (fixed !== null && current.phase !== fixed.phase)
      ) {
        throw new CombatChangedError()
      }
      const running = current.phase === 'running'
      const plan = fixed ?? {
        phase: current.phase,
        slices: characterSlices(running ? [...characters, ...npcs] : characters),
      }
      if (
        fixed === null &&
        current.order.length + plan.slices.flat().length > COMBAT_LIMITS.combatants
      ) {
        throw new Error('Too many combatants')
      }
      const slice = plan.slices[index] ?? []
      for (const item of slice) writeCombatant(transaction, db, input.combatId, item, running)
      if (running && slice.length > 0) {
        transaction.update(doc(db, 'combat', 'main'), {
          order: [...current.order, ...slice.map((item) => item.id)],
        })
      }
      return plan
    })

  const plan = await step(0, null)
  const npcGroups =
    plan.phase === 'running' ? [] : input.npcGroups.map((group) => prepareNpcGroup(db, group))
  for (let index = 1; index < plan.slices.length; index++) {
    try {
      await step(index, plan)
    } catch {
      return { npcGroups, leftOut: charactersOf(plan.slices.slice(index)) }
    }
  }
  return { npcGroups, leftOut: [] }
}

/**
 * Removes a combatant (design D5). While the fight runs, the order and the turn follow: removing the active one makes
 * the next active.
 */
export async function removeCombatant(db: Firestore, id: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    transaction.delete(rawCombatant(db, id))
    transaction.delete(rawDmCombatant(db, id))
    if (current.phase !== 'running' || !current.order.includes(id)) return
    const activeRemoved = current.order[current.turn] === id
    const next = turnAfterRemoval(current.order, current, id)
    transaction.update(doc(db, 'combat', 'main'), {
      order: next.order,
      turn: next.turn,
      round: next.round,
      ...(activeRemoved ? { turnAt: serverTimestamp() } : {}),
    })
  })
}

/**
 * "Bitir" or "Vazgeç" (design D7): deletes every combatant and DM record, sets the combat idle, and records the end of
 * a fight that had started.
 */
export async function endCombat(
  db: Firestore,
  input: { by: string; combatantIds: readonly string[] },
): Promise<void> {
  const changeRef = doc(collection(db, COMBAT_CHANGES_COLLECTION))
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(combatRef(db))).data() ?? IDLE_COMBAT
    if (current.phase === 'idle') return
    for (const id of input.combatantIds) {
      transaction.delete(rawCombatant(db, id))
      transaction.delete(rawDmCombatant(db, id))
    }
    const started = current.phase === 'running'
    transaction.update(doc(db, 'combat', 'main'), {
      ...IDLE_COMBAT,
      changeId: started ? changeRef.id : current.changeId,
    })
    if (started) {
      transaction.set(changeRef, {
        by: input.by,
        at: serverTimestamp(),
        step: 'end',
        count: current.round,
      })
    }
  })
}

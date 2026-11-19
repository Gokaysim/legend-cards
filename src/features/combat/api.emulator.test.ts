import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  type Firestore,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { rollDice, type Thrower } from '@/features/dice/api'

import {
  addCombatants,
  clearRoll,
  combatantsRef,
  combatChangesRef,
  combatRef,
  delayMyTurn,
  dmCombatantsRef,
  endCombat,
  endMyTurn,
  initiativeRequest,
  initiativeWrites,
  moveCombatant,
  npcGroupRequest,
  npcGroupWrites,
  openCombat,
  removeCombatant,
  startFight,
  stepTurn,
} from './api'
import { CombatOpenError } from './errors'
import { initiativeOrder } from './order'
import type { Combatant } from './schema'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. */
const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player', 'Ayla'))
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    const character = (uid: string, name: string) => ({
      uid,
      name,
      picture: null,
      archived: false,
      createdAt: Timestamp.fromMillis(1),
      createdBy: uid,
    })
    await setDoc(doc(db, 'characters/thorn'), character('ayla', 'Thorn'))
    await setDoc(doc(db, 'characters/elara'), character('bora', 'Elara'))
  })
})

/** A thrower with fixed faces and no physics. */
const fixed =
  (...values: number[]): Thrower =>
  () =>
    Promise.resolve({ values, motion: null })

async function combatants(db: Firestore = as('dana')): Promise<Combatant[]> {
  return (await getDocs(combatantsRef(db))).docs.map((d) => d.data())
}

async function combatantOf(characterId: string): Promise<Combatant> {
  const found = (await combatants()).find((c) => c.characterId === characterId)
  if (!found) throw new Error(`No combatant for ${characterId}`)
  return found
}

/** Opens a combat with Thorn, Elara and four goblins at +1, and rolls the goblins hidden. */
async function openWithGoblins() {
  const dm = as('dana')
  const opened = await openCombat(dm, {
    by: 'dana',
    characters: [
      { characterId: 'thorn', uid: 'ayla' },
      { characterId: 'elara', uid: 'bora' },
    ],
    npcGroups: [{ name: 'Goblin', count: 4, modifier: 1 }],
  })
  const group = opened.npcGroups[0]
  if (!group) throw new Error('No goblins')
  const { written } = await rollDice(
    dm,
    { ...npcGroupRequest(group), by: 'dana', style: 'galaxy' },
    fixed(14, 7, 20, 2),
    npcGroupWrites(dm, group, opened.combatId),
  )
  await written
  return { ...opened, goblins: group }
}

/** Ayla's or Bora's "At" for their character. */
async function rollFor(uid: string, characterId: string, name: string, die: number, mod: number) {
  const db = as(uid)
  const combatant = await combatantOf(characterId)
  const { written } = await rollDice(
    db,
    { ...initiativeRequest(name, mod), by: uid, style: 'walnut' },
    fixed(die),
    initiativeWrites(db, combatant, mod),
  )
  return written
}

/** Seeds `count` of Ayla's characters, `hero0` to `hero<count-1>`, and returns them as joining characters. */
async function seedHeroes(count: number, from = 0) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    for (let i = from; i < from + count; i++) {
      await setDoc(doc(db, `characters/hero${String(i)}`), {
        uid: 'ayla',
        name: `Hero ${String(i)}`,
        picture: null,
        archived: false,
        createdAt: Timestamp.fromMillis(1),
        createdBy: 'ayla',
      })
    }
  })
  return Array.from({ length: count }, (_, i) => ({
    characterId: `hero${String(from + i)}`,
    uid: 'ayla',
  }))
}

describe('opening and rolling', () => {
  it('opens a combat, rolls the goblins hidden and a player character in the channel', async () => {
    const { combatId, goblins } = await openWithGoblins()
    expect(goblins.names).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4'])

    const combat = (await getDoc(combatRef(as('ayla')))).data()
    expect(combat).toMatchObject({ phase: 'gathering', combatId, order: [] })

    const goblinRolls = (await getDocs(dmCombatantsRef(as('dana')))).docs.map((d) => d.data())
    expect(goblinRolls.map((r) => r.die).sort((a, b) => a - b)).toEqual([2, 7, 14, 20])
    const publicGoblins = (await combatants(as('ayla'))).filter((c) => c.kind === 'npc')
    expect(publicGoblins.every((c) => c.rolled && c.roll === null)).toBe(true)

    await rollFor('ayla', 'thorn', 'Thorn', 17, 3)
    expect((await combatantOf('thorn')).roll).toMatchObject({ die: 17, modifier: 3 })
    const thorn = await getDoc(doc(as('ayla'), 'characters/thorn'))
    expect(thorn.get('initiativeModifier')).toBe(3)
  })

  it('refuses a second combat', async () => {
    await openWithGoblins()
    await expect(
      openCombat(as('dana'), {
        by: 'dana',
        characters: [{ characterId: 'thorn', uid: 'ayla' }],
        npcGroups: [],
      }),
    ).rejects.toBeInstanceOf(CombatOpenError)
  })

  it("refuses rolling another player's character, and the roll is not written", async () => {
    await openWithGoblins()
    await expect(rollFor('bora', 'thorn', 'Thorn', 12, 0)).rejects.toThrow()
    expect((await combatantOf('thorn')).roll).toBeNull()
  })

  it('lets the DM clear a roll, so the player rolls again', async () => {
    await openWithGoblins()
    await rollFor('ayla', 'thorn', 'Thorn', 4, 3)
    await clearRoll(as('dana'), await combatantOf('thorn'))
    expect(await combatantOf('thorn')).toMatchObject({ rolled: false, roll: null })
    await rollFor('ayla', 'thorn', 'Thorn', 15, 3)
    expect((await combatantOf('thorn')).roll?.die).toBe(15)
  })

  it('adds a character and a rolled NPC group while gathering', async () => {
    const { combatId } = await openWithGoblins()
    const dm = as('dana')
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'characters/brom'), {
        uid: 'bora',
        name: 'Brom',
        picture: null,
        archived: false,
        createdAt: Timestamp.fromMillis(1),
        createdBy: 'bora',
      })
    })
    const added = await addCombatants(dm, {
      by: 'dana',
      combatId,
      firstSeq: 6,
      characters: [{ characterId: 'brom', uid: 'bora' }],
      npcGroups: [{ name: 'Ogre', count: 1, modifier: 2 }],
    })
    const ogre = added.npcGroups[0]
    if (!ogre) throw new Error('No ogre')
    const { written } = await rollDice(
      dm,
      { ...npcGroupRequest(ogre), by: 'dana', style: 'galaxy' },
      fixed(11),
      npcGroupWrites(dm, ogre, combatId, { dmUid: 'dana', firstSeq: 7 }),
    )
    await written
    const all = await combatants()
    expect(all.find((c) => c.characterId === 'brom')).toMatchObject({ rolled: false, seq: 6 })
    expect(all.find((c) => c.name === 'Ogre')).toMatchObject({ rolled: true, seq: 7 })
  })
})

describe('the fight', () => {
  /** Opens, rolls Thorn 17+3 and leaves Elara without a roll, then starts with the DM's order. */
  async function startedFight() {
    const opened = await openWithGoblins()
    await rollFor('ayla', 'thorn', 'Thorn', 17, 3)
    const all = await combatants()
    const dmRolls = new Map(
      (await getDocs(dmCombatantsRef(as('dana')))).docs.map((d) => [d.id, d.data()]),
    )
    const order = initiativeOrder(
      all.map((c) => {
        const npc = dmRolls.get(c.id)
        return {
          id: c.id,
          seq: c.seq,
          die: c.roll?.die ?? npc?.die ?? null,
          modifier: c.roll?.modifier ?? npc?.modifier ?? null,
        }
      }),
    )
    await startFight(as('dana'), { by: 'dana', combatId: opened.combatId, order })
    return { ...opened, order, all }
  }

  /** The turn a user saw: the place, the round and the combatant active there. */
  const at = (order: readonly string[], turn: number, round: number) => ({
    turn,
    round,
    activeId: order[turn] ?? null,
  })

  const nameOf = (all: readonly Combatant[], id: string | undefined) => {
    const c = all.find((x) => x.id === id)
    return c?.name ?? c?.characterId ?? null
  }

  it('starts in the initiative order with someone who did not roll last, and records the start', async () => {
    const { order, all } = await startedFight()
    // Goblin 3 rolled a natural 20; Thorn 20; Goblin 1 15; Goblin 2 8; Goblin 4 a natural 1; Elara did not roll.
    expect(order.map((id) => nameOf(all, id))).toEqual([
      'Goblin 3',
      'thorn',
      'Goblin 1',
      'Goblin 2',
      'Goblin 4',
      'elara',
    ])
    const combat = (await getDoc(combatRef(as('ayla')))).data()
    expect(combat).toMatchObject({ phase: 'running', turn: 0, round: 1, order })
    const changes = (await getDocs(combatChangesRef(as('ayla')))).docs.map((d) => d.data())
    expect(changes).toMatchObject([{ by: 'dana', step: 'start', count: 6 }])
  })

  it('refuses a roll after the start', async () => {
    await startedFight()
    await expect(rollFor('bora', 'elara', 'Elara', 9, 1)).rejects.toThrow()
  })

  it('steps turns as the DM, and a double press steps once', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await Promise.all([
      stepTurn(dm, 'next', at(order, 0, 1)),
      stepTurn(as('dana'), 'next', at(order, 0, 1)),
    ])
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 1, round: 1 })
    await stepTurn(dm, 'back', at(order, 1, 1))
    await stepTurn(dm, 'back', at(order, 0, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 0, round: 1 })
  })

  it("lets the active character's owner end their turn, and drops a press that is not theirs", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await endMyTurn(as('bora'), 'bora', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 1 })
    await endMyTurn(as('ayla'), 'ayla', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 2, round: 1 })
  })

  it("keeps one step when a player's turn end races the DM's step", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await Promise.all([
      endMyTurn(as('ayla'), 'ayla', at(order, 1, 1)),
      stepTurn(dm, 'next', at(order, 1, 1)),
    ])
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 2, round: 1 })
  })

  /** Changes stored documents, bypassing the rules. */
  async function asAdmin(changes: Record<string, Record<string, unknown>>) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      for (const [path, data] of Object.entries(changes)) {
        await updateDoc(doc(firestoreOf(admin), path), data)
      }
    })
  }

  const ids = (order: readonly string[], places: readonly number[]) =>
    places.map((place) => order[place] ?? '')

  it("lets the active character's owner delay behind the next one, and drops a delay that is not theirs", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await delayMyTurn(as('bora'), 'bora', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ order, turn: 1 })
    await delayMyTurn(as('ayla'), 'ayla', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({
      order: ids(order, [0, 2, 1, 3, 4, 5]),
      turn: 1,
      round: 1,
    })
  })

  it('delays the last combatant behind the first one, into the next round', async () => {
    const { order } = await startedFight()
    await asAdmin({ 'combat/main': { turn: 5 } })
    await delayMyTurn(as('bora'), 'bora', at(order, 5, 1))
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({
      order: ids(order, [0, 5, 1, 2, 3, 4]),
      turn: 0,
      round: 2,
    })
  })

  it('delays once when a player who owns the next combatant too presses twice', async () => {
    const { order, all } = await startedFight()
    const elara = all.find((c) => c.characterId === 'elara')?.id ?? ''
    const together = ids(order, [0, 1, 5, 2, 3, 4])
    expect(together[2]).toBe(elara)
    await asAdmin({
      'combat/main': { order: together, turn: 1 },
      [`combatants/${elara}`]: { uid: 'ayla' },
    })
    await Promise.all([
      delayMyTurn(as('ayla'), 'ayla', at(together, 1, 1)),
      delayMyTurn(as('ayla'), 'ayla', at(together, 1, 1)),
    ])
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({
      order: ids(together, [0, 2, 1, 3, 4, 5]),
      turn: 1,
      round: 1,
    })
  })

  it("keeps one step when a player's delay races the DM's step", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await Promise.all([
      delayMyTurn(as('ayla'), 'ayla', at(order, 1, 1)),
      stepTurn(dm, 'next', at(order, 1, 1)),
    ])
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.round).toBe(1)
    expect(combat?.order[combat.turn]).toBe(order[2])
  })

  it("drops the DM's step from a turn whose active combatant was removed", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await removeCombatant(dm, order[1] ?? '')
    await stepTurn(dm, 'next', at(order, 1, 1))
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat).toMatchObject({ turn: 1, round: 1 })
    expect(combat?.order[combat.turn]).toBe(order[2])
  })

  it('reorders with the active combatant kept active', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    const thorn = order[1] ?? ''
    await moveCombatant(dm, thorn, 3)
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.order[3]).toBe(thorn)
    expect(combat?.turn).toBe(3)
  })

  it('removes the active combatant and makes the next one active', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await removeCombatant(dm, order[1] ?? '')
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.order).toEqual(order.filter((id) => id !== order[1]))
    expect(combat?.order[combat.turn]).toBe(order[2])
    expect((await getDoc(doc(combatantsRef(dm), order[1] ?? 'x'))).exists()).toBe(false)
  })

  it('adds combatants by hand during the fight, last', async () => {
    const { combatId, order } = await startedFight()
    await addCombatants(as('dana'), {
      by: 'dana',
      combatId,
      firstSeq: 10,
      characters: [],
      npcGroups: [{ name: 'Kurt', count: 2, modifier: 0 }],
    })
    const combat = (await getDoc(combatRef(as('dana')))).data()
    expect(combat?.order).toHaveLength(order.length + 2)
    const wolves = (await combatants()).filter((c) => c.name?.startsWith('Kurt'))
    expect(wolves.map((w) => w.name).sort()).toEqual(['Kurt 1', 'Kurt 2'])
    expect(wolves.every((w) => w.manual && !w.rolled)).toBe(true)
  })

  it('adds ten characters and two wolves during the fight, last and in the chosen order', async () => {
    const { combatId, order } = await startedFight()
    const heroes = await seedHeroes(10)
    const added = await addCombatants(as('dana'), {
      by: 'dana',
      combatId,
      firstSeq: 10,
      characters: heroes,
      npcGroups: [{ name: 'Kurt', count: 2, modifier: 0 }],
    })
    expect(added).toEqual({ npcGroups: [], leftOut: [] })
    const combat = (await getDoc(combatRef(as('dana')))).data()
    const all = await combatants()
    const byId = new Map(all.map((c) => [c.id, c]))
    const tail = (combat?.order ?? []).slice(order.length).map((id) => byId.get(id))
    expect(combat?.order.slice(0, order.length)).toEqual(order)
    expect(tail.map((c) => c?.characterId ?? c?.name)).toEqual([
      ...heroes.map((h) => h.characterId),
      'Kurt 1',
      'Kurt 2',
    ])
    expect(tail.every((c) => c?.manual === true && !c.rolled)).toBe(true)
  })

  it('ends the fight: empty collections, idle, and an end record with the round', async () => {
    const { all, order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'back', at(order, 0, 1))
    for (let i = 0; i < 6; i++) {
      const c = (await getDoc(combatRef(dm))).data()
      await stepTurn(dm, 'next', at(c?.order ?? [], c?.turn ?? 0, c?.round ?? 1))
    }
    await endCombat(dm, { by: 'dana', combatantIds: all.map((c) => c.id) })
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ phase: 'idle', combatId: null })
    expect(await combatants()).toEqual([])
    expect((await getDocs(dmCombatantsRef(dm))).empty).toBe(true)
    const changes = (await getDocs(combatChangesRef(dm))).docs.map((d) => d.data())
    expect(changes.find((c) => c.step === 'end')).toMatchObject({ count: 2 })
  })

  it('gives up a combat before the fight without a record', async () => {
    await openWithGoblins()
    const dm = as('dana')
    await endCombat(dm, { by: 'dana', combatantIds: (await combatants()).map((c) => c.id) })
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ phase: 'idle' })
    expect((await getDocs(combatChangesRef(dm))).empty).toBe(true)
  })
})

describe('large combats', () => {
  it('opens a combat with 12 characters and six goblins, in the chosen order', async () => {
    const heroes = await seedHeroes(12)
    const opened = await openCombat(as('dana'), {
      by: 'dana',
      characters: heroes,
      npcGroups: [{ name: 'Goblin', count: 6, modifier: 1 }],
    })
    expect(opened.leftOut).toEqual([])
    const all = (await combatants()).sort((a, b) => a.seq - b.seq)
    expect(all.map((c) => c.seq)).toEqual(Array.from({ length: 18 }, (_, i) => i))
    expect(all.map((c) => c.characterId ?? c.name)).toEqual([
      ...heroes.map((h) => h.characterId),
      ...Array.from({ length: 6 }, (_, i) => `Goblin ${String(i + 1)}`),
    ])
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({
      phase: 'gathering',
      combatId: opened.combatId,
    })
  })

  it('adds ten characters while the rolls come in', async () => {
    const { combatId } = await openWithGoblins()
    const heroes = await seedHeroes(10)
    const added = await addCombatants(as('dana'), {
      by: 'dana',
      combatId,
      firstSeq: 6,
      characters: heroes,
      npcGroups: [],
    })
    expect(added).toEqual({ npcGroups: [], leftOut: [] })
    const all = await combatants()
    const joined = heroes.map((h) => all.find((c) => c.characterId === h.characterId))
    expect(joined.map((c) => c?.seq)).toEqual(Array.from({ length: 10 }, (_, i) => 6 + i))
    expect(joined.every((c) => c?.manual === false && !c.rolled)).toBe(true)
  })

  it('opens a combat with 50 combatants and rolls both NPC groups', async () => {
    const heroes = await seedHeroes(26)
    const dm = as('dana')
    const opened = await openCombat(dm, {
      by: 'dana',
      characters: heroes,
      npcGroups: [
        { name: 'Goblin', count: 12, modifier: 1 },
        { name: 'Kurt', count: 12, modifier: 0 },
      ],
    })
    expect(opened.leftOut).toEqual([])
    for (const group of opened.npcGroups) {
      const { written } = await rollDice(
        dm,
        { ...npcGroupRequest(group), by: 'dana', style: 'galaxy' },
        fixed(...group.ids.map((_, i) => 1 + i)),
        npcGroupWrites(dm, group, opened.combatId),
      )
      await written
    }
    const all = await combatants()
    expect(all).toHaveLength(50)
    expect(all.filter((c) => c.kind === 'npc').every((c) => c.rolled)).toBe(true)
    expect((await getDocs(dmCombatantsRef(dm))).size).toBe(24)
  })

  it('keeps a combat cut short open and returns the characters left out', async () => {
    const heroes = await seedHeroes(12)
    // A character without a record in the second group: the rules deny that write.
    const chosen = heroes.map((h, i) => (i === 7 ? { characterId: 'ghost', uid: 'ayla' } : h))
    const opened = await openCombat(as('dana'), {
      by: 'dana',
      characters: chosen,
      npcGroups: [{ name: 'Goblin', count: 4, modifier: 1 }],
    })
    expect(opened.leftOut).toEqual(chosen.slice(6))
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({ phase: 'gathering' })
    const all = await combatants()
    expect(all.filter((c) => c.kind === 'character').map((c) => c.characterId)).toEqual(
      expect.arrayContaining(chosen.slice(0, 6).map((h) => h.characterId)),
    )
    expect(all).toHaveLength(10)
  })

  it('throws and opens nothing when the first group fails', async () => {
    const heroes = await seedHeroes(12)
    const chosen = heroes.map((h, i) => (i === 2 ? { characterId: 'ghost', uid: 'ayla' } : h))
    await expect(
      openCombat(as('dana'), { by: 'dana', characters: chosen, npcGroups: [] }),
    ).rejects.toThrow()
    expect((await getDoc(combatRef(as('dana')))).data()?.phase ?? 'idle').toBe('idle')
    expect(await combatants()).toEqual([])
  })

  it('returns the characters left out when adding is cut short, and throws when the first group fails', async () => {
    const { combatId } = await openWithGoblins()
    const heroes = await seedHeroes(12)
    const dm = as('dana')
    const withGhostAt = (at: number) =>
      heroes.map((h, i) => (i === at ? { characterId: 'ghost', uid: 'ayla' } : h))

    await expect(
      addCombatants(dm, {
        by: 'dana',
        combatId,
        firstSeq: 6,
        characters: withGhostAt(1),
        npcGroups: [],
      }),
    ).rejects.toThrow()
    expect(await combatants()).toHaveLength(6)

    const chosen = withGhostAt(9)
    const added = await addCombatants(dm, {
      by: 'dana',
      combatId,
      firstSeq: 6,
      characters: chosen,
      npcGroups: [{ name: 'Ogre', count: 1, modifier: 2 }],
    })
    expect(added.leftOut).toEqual(chosen.slice(6))
    expect(added.npcGroups).toHaveLength(1)
    expect(await combatants()).toHaveLength(12)
  })
})

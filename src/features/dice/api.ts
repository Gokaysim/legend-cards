import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  getCountFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  type Query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type WriteBatch,
  writeBatch,
} from 'firebase/firestore'

import { TABLE_CHANGES_COLLECTION } from '@/features/table/api'
import { USERS_COLLECTION } from '@/features/users/api'
import { randomIndex } from '@/lib/random'

import { DiceResetIncompleteError } from './errors'
import {
  type DiceCounts,
  type DieType,
  DIE_MAX,
  MODIFIER_MAX,
  MODIFIER_MIN,
  NOTE_MAX,
  type RollMode,
  type RolledDie,
  checkedModifierSum,
  isSingleD20,
  physicalDice,
} from './formula'
import {
  type DiceRoll,
  diceRollConverter,
  type DiceStyle,
  type DieMotion,
  dmRollConverter,
  encodeMotion,
  SIM_NONE,
  SIM_THROWS_AND_RESTS,
} from './schema'

/** Keep in step with `firestore.rules`. */
export const DICE_ROLLS_COLLECTION = 'diceRolls'
export const DM_ROLLS_COLLECTION = 'dmRolls'

/** Every roll, validated, with the document ID as `id`. A hidden roll's record holds no content. */
export function diceRollsRef(db: Firestore): CollectionReference<DiceRoll> {
  return collection(db, DICE_ROLLS_COLLECTION).withConverter(diceRollConverter)
}

/** Every hidden roll's content. Only the DM may read it: never build this ref on a player's device. */
export function dmRollsRef(db: Firestore): CollectionReference<DiceRoll> {
  return collection(db, DM_ROLLS_COLLECTION).withConverter(dmRollConverter)
}

/** The `count` newest rolls, newest first (design D6). Ordered on one field, so no composite index is needed. */
export function recentRollsQuery(db: Firestore, count: number): Query<DiceRoll> {
  return query(diceRollsRef(db), orderBy('at', 'desc'), limit(count))
}

/** The `count` newest hidden rolls' content, newest first: the DM's device only. */
export function recentDmRollsQuery(db: Firestore, count: number): Query<DiceRoll> {
  return query(dmRollsRef(db), orderBy('at', 'desc'), limit(count))
}

/** What the roll form asks for. */
export type RollInput = {
  /** The signed-in user, who rolls. */
  by: string
  counts: DiceCounts
  /** Advantage and disadvantage apply only to a single d20; any other formula rolls normally. */
  mode: RollMode
  modifier: number
  /**
   * The fixed number as written, when it is a sum of two or more numbers, such as "5+10-4" (spec: dice-rolls, "A
   * fixed number written as a sum"). It must add up to `modifier`; otherwise it is left out.
   */
  modifierSum?: string | null
  note: string
  /** The DM's hidden roll. The rules refuse it from a player. */
  hidden: boolean
  /** The roller's dice style now; the record keeps it. */
  style: DiceStyle
}

/** The faces and motion of a throw. `motion` is `null` when the physics could not load. */
export type ThrowResult = { values: number[]; motion: DieMotion[] | null }

/** Throws the dice, keeping the simulation for `rollId`'s playback on this device. */
export type Thrower = (
  dice: readonly DieType[],
  style: DiceStyle,
  rollId: string,
) => Promise<ThrowResult>

/** A face of each die, without physics: the fallback when the 3D part cannot load (spec: "Dice without motion"). */
export function flatThrow(dice: readonly DieType[]): ThrowResult {
  return {
    values: dice.map((type) =>
      type === 'd100' ? randomIndex(10) * 10 : randomIndex(DIE_MAX[type]) + 1,
    ),
    motion: null,
  }
}

/** Throws with the lazily loaded physics, or flat when it cannot load (for example offline before its first load). */
export const throwWithPhysics: Thrower = async (dice, style, rollId) => {
  try {
    const { throwDice } = await import('./stage/throwDice')
    return await throwDice(dice, style, rollId)
  } catch (error) {
    console.warn('Dice physics unavailable; rolling without motion', error)
    return flatThrow(dice)
  }
}

/** The note as stored: trimmed and cut to 80 UTF-16 units, without splitting a character in half. */
export function rollNote(note: string): string {
  let text = note.trim().slice(0, NOTE_MAX)
  const last = text.charCodeAt(text.length - 1)
  if (last >= 0xd800 && last <= 0xdbff) text = text.slice(0, -1)
  return text
}

function clampModifier(modifier: number): number {
  if (!Number.isInteger(modifier)) return 0
  return Math.min(MODIFIER_MAX, Math.max(MODIFIER_MIN, modifier))
}

/**
 * Other writes that go in the same batch as a roll (design D3 of add-initiative-tracker), given the roll's ID and the
 * face of each physical die in throw order.
 */
export type AlsoWrite = (batch: WriteBatch, rollId: string, values: readonly number[]) => void

/** A roll just made: its record as this device shows it at once, and the write that sends it. */
export type RollResult = {
  roll: DiceRoll
  /** Resolves when the server has the roll. Offline, it waits until the connection returns. */
  written: Promise<void>
}

/**
 * Rolls the dice (design D2, D4): throws them on this device, then writes the record, or for a hidden roll the
 * public record and the DM's record in one batch. With `alsoWrite`, the caller's writes join that batch, so the roll
 * and they are written together or not at all. Returns at once with the roll for the local playback; the write is
 * queued offline and sent when the connection returns.
 */
export async function rollDice(
  db: Firestore,
  input: RollInput,
  thrower: Thrower = throwWithPhysics,
  alsoWrite?: AlsoWrite,
): Promise<RollResult> {
  const mode: RollMode = isSingleD20(input.counts) ? input.mode : 'normal'
  const types = physicalDice(input.counts, mode)
  if (types.length === 0) throw new Error('A roll needs at least one die')
  const ref = doc(collection(db, DICE_ROLLS_COLLECTION))
  const { values, motion } = await thrower(types, input.style, ref.id)
  const dice: RolledDie[] = types.map((t, index) => ({ t, v: values[index] ?? 1 }))
  const modifier = clampModifier(input.modifier)
  // The written sum goes in only when it adds up, so the record never shows numbers its total does not use.
  const modifierSum = checkedModifierSum(modifier, input.modifierSum)
  const content = {
    style: input.style,
    mode,
    modifier,
    ...(modifierSum ? { modifierSum } : {}),
    note: rollNote(input.note),
    dice,
    motion: motion ? encodeMotion(motion) : '',
    sim: motion ? SIM_THROWS_AND_RESTS : SIM_NONE,
  }

  let written: Promise<void>
  if (input.hidden) {
    const batch = writeBatch(db)
    batch.set(ref, { by: input.by, at: serverTimestamp(), hidden: true })
    batch.set(doc(db, DM_ROLLS_COLLECTION, ref.id), {
      by: input.by,
      at: serverTimestamp(),
      hidden: true,
      ...content,
    })
    alsoWrite?.(batch, ref.id, values)
    written = batch.commit()
  } else if (alsoWrite) {
    const batch = writeBatch(db)
    batch.set(ref, { by: input.by, at: serverTimestamp(), hidden: false, ...content })
    alsoWrite(batch, ref.id, values)
    written = batch.commit()
  } else {
    written = setDoc(ref, { by: input.by, at: serverTimestamp(), hidden: false, ...content })
  }
  // The caller may never wait for it; a failure is reported by the subscription dropping the pending roll.
  written.catch((error: unknown) => console.warn('Dice roll not written', error))

  return {
    roll: {
      id: ref.id,
      by: input.by,
      at: null,
      hidden: input.hidden,
      content: {
        style: content.style,
        mode,
        modifier: content.modifier,
        modifierSum,
        note: content.note,
        dice,
        motion,
      },
    },
    written,
  }
}

/** Saves the user's own dice style (spec: user-profiles). Offline, the write is queued. */
export function setDiceStyle(db: Firestore, uid: string, style: DiceStyle): Promise<void> {
  return updateDoc(doc(db, USERS_COLLECTION, uid), { diceStyle: style })
}

/** The most writes one batch may hold. */
export const RESET_BATCH_WRITES = 500

/** How many rolls the channel holds on the server, a hidden roll counted once. It needs a connection. */
export async function countRollsOnServer(db: Firestore): Promise<number> {
  return (await getCountFromServer(diceRollsRef(db))).data().count
}

/**
 * Resets the dice channel as the DM (design D1, D2 of release-1-0-0): reads every roll record and every hidden
 * roll's content from the server, writes the `diceReset` record with the first deletes, and deletes the rest in
 * batches of at most 500 writes, one after the other. Resolves with the number of rolls deleted. It needs a
 * connection: offline, the reads fail before anything is written. A player's reset fails on the DM-only read, so
 * nothing is deleted. When a batch after the first fails, it throws `DiceResetIncompleteError`.
 */
export async function resetDiceChannel(db: Firestore, input: { by: string }): Promise<number> {
  const [rolls, contents] = await Promise.all([
    getDocsFromServer(diceRollsRef(db)),
    getDocsFromServer(dmRollsRef(db)),
  ])
  const refs: DocumentReference[] = [...rolls.docs, ...contents.docs].map((roll) => roll.ref)

  const first = writeBatch(db)
  first.set(doc(collection(db, TABLE_CHANGES_COLLECTION)), {
    by: input.by,
    at: serverTimestamp(),
    setting: 'diceReset',
    rolls: rolls.size,
  })
  const firstDeletes = RESET_BATCH_WRITES - 1
  for (const ref of refs.slice(0, firstDeletes)) first.delete(ref)
  await first.commit()

  try {
    for (let start = firstDeletes; start < refs.length; start += RESET_BATCH_WRITES) {
      const batch = writeBatch(db)
      for (const ref of refs.slice(start, start + RESET_BATCH_WRITES)) batch.delete(ref)
      await batch.commit()
    }
  } catch (error) {
    throw new DiceResetIncompleteError(error)
  }
  return rolls.size
}

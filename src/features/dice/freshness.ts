import type { DiceRoll } from './schema'

/** A roll plays only when it was made at most this long ago (spec: dice-rolls, "Only fresh rolls play"). */
export const FRESH_WINDOW_MS = 10_000

/** What this device knows about the rolls that arrive (design D6). */
export type Freshness = {
  /** The rolls with content this device has seen; `null` before the first snapshot. */
  known: ReadonlySet<string> | null
  /** The roll to play now, or `null`. */
  fresh: DiceRoll | null
}

export const NO_FRESHNESS: Freshness = { known: null, fresh: null }

/** Whether a roll was made recently: a pending time counts as now, and a time ahead of this clock as recent. */
export function isRecent(roll: DiceRoll, now: number): boolean {
  return roll.at === null || now - roll.at.toMillis() <= FRESH_WINDOW_MS
}

/**
 * The freshness after a snapshot of the rolls, newest first (design D6). Only rolls with content can play, so a
 * hidden roll never plays on a player's device. A roll is fresh when:
 * - it arrived in a snapshot after the first one
 * - it is the newest of that snapshot's arrivals
 * - it was made at most 10 seconds ago
 * - this device did not roll it (`rolledHere`): the roller's own roll plays from its roll at once
 *
 * Returns `state` itself when nothing arrived, so a caller can tell that nothing changed.
 */
export function arrive(
  state: Freshness,
  rolls: readonly DiceRoll[],
  now: number,
  rolledHere: ReadonlySet<string>,
): Freshness {
  const playable = rolls.filter((roll) => roll.content !== null)
  if (state.known === null) return { known: new Set(playable.map((roll) => roll.id)), fresh: null }
  const known = state.known
  const arrivals = playable.filter((roll) => !known.has(roll.id))
  if (arrivals.length === 0) return state
  const [newest] = arrivals
  const isFresh = newest !== undefined && !rolledHere.has(newest.id) && isRecent(newest, now)
  return {
    known: new Set([...known, ...arrivals.map((roll) => roll.id)]),
    fresh: isFresh ? newest : state.fresh,
  }
}

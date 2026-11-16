import type { Combatant, DmCombatant } from './schema'

/**
 * The initiative order and the turn steps (spec: initiative-tracker; design D2, D5 of add-initiative-tracker), as
 * pure functions. Only the DM's device computes the order; every device shows the stored `order`.
 */

/** A combatant as the order sees it: its join order and its roll, `die` `null` when it has not rolled. */
export type OrderEntry = {
  id: string
  seq: number
  die: number | null
  modifier: number | null
}

/** Puts a group of tied entries in some order. The default keeps them in join order. */
export type TieBreaker = <T>(items: readonly T[]) => T[]

const keepOrder: TieBreaker = (items) => [...items]

export type NaturalMark = 'nat20' | 'nat1'

/** A natural 20 or a natural 1 of the d20, or `null` (spec: "The initiative order"). */
export function naturalMark(die: number | null): NaturalMark | null {
  if (die === 20) return 'nat20'
  if (die === 1) return 'nat1'
  return null
}

/** The total of a roll: the die plus the modifier, or `null` without a roll. */
export function totalOf(entry: Pick<OrderEntry, 'die' | 'modifier'>): number | null {
  return entry.die === null ? null : entry.die + (entry.modifier ?? 0)
}

/**
 * The initiative order (design D2): the natural 20s, then the totals from high to low, then the natural 1s, then
 * those who have not rolled, in join order. `breakTies` orders the natural 20s, the natural 1s, and each group of
 * equal totals; by default they keep their join order.
 */
export function initiativeOrder(
  entries: readonly OrderEntry[],
  breakTies: TieBreaker = keepOrder,
): string[] {
  const bySeq = [...entries].sort((a, b) => a.seq - b.seq)
  const naturalTwenties = bySeq.filter((e) => e.die === 20)
  const naturalOnes = bySeq.filter((e) => e.die === 1)
  const others = bySeq.filter((e) => e.die !== null && e.die !== 20 && e.die !== 1)
  const waiting = bySeq.filter((e) => e.die === null)

  const totals = [...new Set(others.map((e) => totalOf(e) ?? 0))].sort((a, b) => b - a)
  const middle = totals.flatMap((total) => breakTies(others.filter((e) => totalOf(e) === total)))

  return [...breakTies(naturalTwenties), ...middle, ...breakTies(naturalOnes), ...waiting].map(
    (e) => e.id,
  )
}

/** The initiative order of the combatants as they stand, the NPCs' rolls from the DM's records (design D2). */
export function currentOrder(
  list: readonly Combatant[],
  npcRolls: ReadonlyMap<string, DmCombatant>,
  breakTies?: TieBreaker,
): string[] {
  return initiativeOrder(
    list.map((c) => {
      const npc = npcRolls.get(c.id)
      const die = c.roll?.die ?? (c.rolled ? (npc?.die ?? null) : null)
      const modifier = c.roll?.modifier ?? npc?.modifier ?? null
      return { id: c.id, seq: c.seq, die, modifier }
    }),
    breakTies,
  )
}

/** The active place and the round. */
export type TurnState = { turn: number; round: number }

/** "Sıradaki": the next place, or the first in the next round after the last. */
export function nextTurn(state: TurnState, length: number): TurnState {
  if (length === 0) return { turn: state.turn, round: state.round }
  return state.turn + 1 < length
    ? { turn: state.turn + 1, round: state.round }
    : { turn: 0, round: state.round + 1 }
}

/** Whether "Geri" can step back: not before round 1's first place. */
export function canStepBack(state: TurnState, length: number): boolean {
  return length > 0 && (state.turn > 0 || state.round > 1)
}

/** "Geri": the place before, or the last of the round before. Stays put where it cannot step back. */
export function previousTurn(state: TurnState, length: number): TurnState {
  if (!canStepBack(state, length)) return { turn: state.turn, round: state.round }
  return state.turn > 0
    ? { turn: state.turn - 1, round: state.round }
    : { turn: length - 1, round: state.round - 1 }
}

/**
 * The order and the turn after removing a combatant (design D5): an earlier place moves the active one up, a later
 * place leaves it, and removing the active one makes the next active, or the first of the next round after the last.
 */
export function turnAfterRemoval(
  order: readonly string[],
  state: TurnState,
  removedId: string,
): TurnState & { order: string[] } {
  const { turn, round } = state
  const index = order.indexOf(removedId)
  if (index < 0) return { order: [...order], turn, round }
  const rest = order.filter((id) => id !== removedId)
  if (rest.length === 0) return { order: rest, turn: 0, round }
  if (index < turn) return { order: rest, turn: turn - 1, round }
  if (index > turn || turn < rest.length) return { order: rest, turn, round }
  return { order: rest, turn: 0, round: round + 1 }
}

/** The active place after a reorder: wherever the active combatant went (design D5). */
export function turnAfterReorder(
  before: readonly string[],
  after: readonly string[],
  turn: number,
): number {
  const active = before[turn]
  const index = active === undefined ? -1 : after.indexOf(active)
  if (index >= 0) return index
  return Math.max(0, Math.min(turn, after.length - 1))
}

/** The order with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items]
  const [moved] = result.splice(from, 1)
  if (moved === undefined) return result
  result.splice(to, 0, moved)
  return result
}

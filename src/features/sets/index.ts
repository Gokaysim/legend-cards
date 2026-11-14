import { normalize } from '@/features/cards/text'

import type { CardSet } from './schema'

/** A set's document ID: its code, normalized (design D1). Empty when the code has no letter or digit. */
export function setIdOf(code: string): string {
  return normalize(code)
}

/** The sets in the shop order: by position, then by ID, so equal positions still sort the same way (design D2). */
export function orderSets(sets: readonly CardSet[]): CardSet[] {
  return [...sets].sort(
    (a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/** The stored sets, and how a card's set code finds its set (spec: card-sets, "A card's set"). */
export type SetIndex = {
  /** Every stored set, in the shop order. */
  sets: readonly CardSet[]
  /** The set whose code or alias equals `code`, ignoring case, accents, spaces and punctuation. */
  setOf: (code: string) => CardSet | undefined
  /** The set's official name, or the code as written when no stored set has it. */
  setName: (code: string) => string
  /** The set's place in the shop order. Codes that no stored set has come after every stored set. */
  setRank: (code: string) => number
}

/** The index of the stored sets. */
export function setIndex(stored: readonly CardSet[]): SetIndex {
  const sets = orderSets(stored)
  const byKey = new Map<string, { set: CardSet; rank: number }>()
  sets.forEach((set, rank) => {
    for (const spelling of [set.code, ...set.aliases]) {
      const key = normalize(spelling)
      if (key !== '' && !byKey.has(key)) byKey.set(key, { set, rank })
    }
  })
  return {
    sets,
    setOf: (code) => byKey.get(normalize(code))?.set,
    setName: (code) => byKey.get(normalize(code))?.set.name ?? code,
    setRank: (code) => byKey.get(normalize(code))?.rank ?? sets.length,
  }
}

/** No stored sets: every code shows as written. The default outside a provider and while the sets load. */
export const EMPTY_SET_INDEX: SetIndex = setIndex([])

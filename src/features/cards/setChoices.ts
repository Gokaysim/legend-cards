import type { SetIndex } from '@/features/sets/index'

import { type SetLookup, setFilterCode } from './pool'
import type { Definition } from './schema'
import { compareLabels } from './sort'

/** The "Blessed" choice of a set filter that lists it. Blessed is not a set: it is never a stored set's code. */
export const BLESSED_SET_CHOICE = 'Blessed'

/** One choice of a set filter: the code a filter keeps, and the label it shows. */
export type SetChoice = { code: string; label: string }

/**
 * The sets the cards belong to, each once: first the stored sets in the shop order, by their official names, then
 * the codes that no stored set has, as written, alphabetically. With `withBlessed`, "Blessed" follows when a
 * Blessed card is among the cards (spec: card-library, "Set and mechanic pack filters"; card-draws, "The set
 * filter's choices").
 */
export function setChoices(
  cards: readonly Pick<Definition, 'kind' | 'setCode'>[],
  sets: SetLookup & Pick<SetIndex, 'setRank'>,
  { withBlessed }: { withBlessed: boolean },
): SetChoice[] {
  const found = new Map<string, { label: string; rank: number }>()
  let hasBlessed = false
  for (const card of cards) {
    if (card.kind === 'blessed') hasBlessed = true
    else if (card.setCode !== null) {
      const code = setFilterCode(card.setCode, sets)
      if (!found.has(code)) found.set(code, { label: sets.setName(code), rank: sets.setRank(code) })
    }
  }
  const choices = [...found]
    .sort(([, a], [, b]) => a.rank - b.rank || compareLabels(a.label, b.label))
    .map(([code, { label }]) => ({ code, label }))
  return withBlessed && hasBlessed
    ? [...choices, { code: BLESSED_SET_CHOICE, label: BLESSED_SET_CHOICE }]
    : choices
}

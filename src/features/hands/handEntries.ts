import type { Card } from '@/features/cards/schema'

import { holdingsOf } from './holdingsContext'
import type { Holding } from './schema'

/**
 * Whether a held card or known word shows as active (design D6 of unify-cards-and-true-words): switched active, and its
 * "Elde etkili" still on. Turning the flag off hides an active holding at once, without rewriting it.
 */
export function showsActive(
  holding: { active: boolean },
  definition: { hasHeldEffect: boolean },
): boolean {
  return holding.active && definition.hasHeldEffect
}

/** One card in a hand, as the hand screen shows it. */
export type HandEntry = {
  /** The holding, its `active` already as it shows (`showsActive`). */
  holding: Holding
  /** The card's definition. A retired card keeps its last stored one until its holding closes. */
  card: Card
  /** The cost in this hand: the cost override, or the card's own cost. */
  cost: string | null
  /** A DM's extra copy: a card with one copy whose holder is another holding (or nobody). */
  isExtraCopy: boolean
}

/**
 * A player's hand in the order the cards were received, each holding with its card. `cardsById` must include
 * retired cards (see `useCardsById`). A holding whose card does not exist at all is left out, and so is a True Word,
 * which is not a card. A holding shows as active only while its card's "Elde etkili" is on.
 */
export function handEntries(
  holdings: readonly Holding[],
  cardsById: ReadonlyMap<string, Card>,
  uid: string,
): HandEntry[] {
  return holdingsOf(holdings, uid).flatMap((holding) => {
    const card = cardsById.get(holding.cardId)
    if (!card) return []
    return [
      {
        holding: { ...holding, active: showsActive(holding, card) },
        card,
        cost: holding.costOverride ?? card.cost,
        isExtraCopy: !card.isRepeatable && card.holder?.userCardId !== holding.id,
      },
    ]
  })
}

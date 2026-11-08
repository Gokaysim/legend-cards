import type { Card } from '@/features/cards/schema'

import { holdingsOf } from './holdingsContext'
import type { Holding } from './schema'

/** One card in a hand, as the hand screen shows it. */
export type HandEntry = {
  holding: Holding
  /** The card's definition. A retired card keeps its last stored one until its holding closes. */
  card: Card
  /** The cost in this hand: the cost override, or the card's own cost. */
  cost: string | null
  /** A DM's extra copy: a normal card whose holder is another holding (or nobody). */
  isExtraCopy: boolean
}

/**
 * A player's hand in the order the cards were received, each holding with its card. `cardsById` must include
 * retired cards (see `useCardsById`). A holding whose card does not exist at all is left out.
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
        holding,
        card,
        cost: holding.costOverride ?? card.cost,
        isExtraCopy: card.kind === 'normal' && card.holder?.userCardId !== holding.id,
      },
    ]
  })
}

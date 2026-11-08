import { createContext, useContext, useMemo } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { Card } from './schema'

/** The two decks the screens show: the Legend cards (normal and Blessed) and the Cursed cards. */
export type Deck = 'legend' | 'cursed'

export type CardsContextValue = {
  /** Every card that is not retired, of every kind. Empty when signed out. */
  cards: Subscription<Card[]>
  /** Every card by its ID, retired ones included, so a hand can still show a held card that was retired. */
  cardsById: Subscription<ReadonlyMap<string, Card>>
}

export const CardsContext = createContext<CardsContextValue | null>(null)

function useCardsContext(): CardsContextValue {
  const value = useContext(CardsContext)
  if (!value) throw new Error('Card hooks must be used inside <CardsProvider>')
  return value
}

/**
 * Builds the shared values from one subscription to every card, retired ones included. Used by `CardsProvider`
 * and the test provider, so both derive the active list and the map the same way.
 */
export function cardsContextValue(allCards: Subscription<Card[]>): CardsContextValue {
  if (allCards.status !== 'ready') return { cards: allCards, cardsById: allCards }
  return {
    cards: { ...allCards, data: allCards.data.filter((card) => !card.retired) },
    cardsById: { ...allCards, data: new Map(allCards.data.map((card) => [card.id, card])) },
  }
}

/** Every active card. Must be used inside `<CardsProvider>`. */
export function useCards(): Subscription<Card[]> {
  return useCardsContext().cards
}

/** Every card by its ID, retired ones included. Must be used inside `<CardsProvider>`. */
export function useCardsById(): Subscription<ReadonlyMap<string, Card>> {
  return useCardsContext().cardsById
}

/** True when the card belongs to the deck: Cursed cards to "cursed", normal and Blessed cards to "legend". */
export function isInDeck(card: Pick<Card, 'kind'>, deck: Deck): boolean {
  return (card.kind === 'cursed') === (deck === 'cursed')
}

/** The active cards of one deck, with the same loading and error states as `useCards`. */
export function useDeckCards(deck: Deck): Subscription<Card[]> {
  const cards = useCards()
  return useMemo(
    () =>
      cards.status === 'ready'
        ? { ...cards, data: cards.data.filter((card) => isInDeck(card, deck)) }
        : cards,
    [cards, deck],
  )
}

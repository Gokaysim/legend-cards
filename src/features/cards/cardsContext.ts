import { createContext, useContext, useMemo } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import { type Card, type Definition, isCard, isTrueWord, type TrueWord } from './schema'

/** The two decks the screens show: the Legend cards (normal and Blessed) and the Cursed cards. */
export type Deck = 'legend' | 'cursed'

export type CardsContextValue = {
  /**
   * Every active card, of every kind but the True Word: no draft and no retired card, and on a player's device no card
   * whose "Listede görünür" is off (spec: card-library, "Cards not listed for players"). Empty when signed out.
   */
  cards: Subscription<Card[]>
  /**
   * Every card this device lists: for the DM all of them, drafts included; for a player the active and retired ones
   * with "Listede görünür" on. The DM's status filter lists from it.
   */
  definitions: Subscription<Card[]>
  /**
   * Every card this device reads, by its ID, so a hand can still show a held card that was retired, or one that is not
   * listed for players.
   */
  cardsById: Subscription<ReadonlyMap<string, Card>>
  /**
   * Every True Word this device reads (design D1 of unify-cards-and-true-words): for the DM all of them, for a player the
   * active and retired ones, hidden ones included, because drafts and hands use them. The True Words screen leaves the
   * hidden ones out for a player.
   */
  words: Subscription<TrueWord[]>
  /** The same True Words by their ID. */
  wordsById: Subscription<ReadonlyMap<string, TrueWord>>
}

export const CardsContext = createContext<CardsContextValue | null>(null)

function useCardsContext(): CardsContextValue {
  const value = useContext(CardsContext)
  if (!value) throw new Error('Card hooks must be used inside <CardsProvider>')
  return value
}

/**
 * Builds the shared values from the one subscription to the definitions this device reads (design D1 of
 * unify-cards-and-true-words). Used by `CardsProvider` and the test provider, so both derive the lists and the maps the
 * same way. It splits the snapshot into cards and True Words. A player's card lists leave out the cards whose "Listede
 * görünür" is off; the map keeps them for the hands.
 */
export function cardsContextValue(
  definitions: Subscription<readonly Definition[]>,
  isDm: boolean,
): CardsContextValue {
  if (definitions.status !== 'ready') {
    return {
      cards: definitions,
      definitions: definitions,
      cardsById: definitions,
      words: definitions,
      wordsById: definitions,
    }
  }
  const allCards = definitions.data.filter(isCard)
  const words = definitions.data.filter(isTrueWord)
  const listed = isDm ? allCards : allCards.filter((card) => card.isInLibrary)
  return {
    cards: { ...definitions, data: listed.filter((card) => card.status === 'active') },
    definitions: { ...definitions, data: listed },
    cardsById: { ...definitions, data: new Map(allCards.map((card) => [card.id, card])) },
    words: { ...definitions, data: words },
    wordsById: { ...definitions, data: new Map(words.map((word) => [word.id, word])) },
  }
}

/** Every active card, without hidden cards on a player's device. Must be used inside `<CardsProvider>`. */
export function useCards(): Subscription<Card[]> {
  return useCardsContext().cards
}

/** Every card this device reads by its ID, retired ones included. Must be used inside `<CardsProvider>`. */
export function useCardsById(): Subscription<ReadonlyMap<string, Card>> {
  return useCardsContext().cardsById
}

/** Every True Word this device reads, retired and hidden ones included. Must be used inside `<CardsProvider>`. */
export function useWords(): Subscription<TrueWord[]> {
  return useCardsContext().words
}

/** Every True Word this device reads, by its ID. Must be used inside `<CardsProvider>`. */
export function useWordsById(): Subscription<ReadonlyMap<string, TrueWord>> {
  return useCardsContext().wordsById
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

/**
 * Every card of one deck this device reads, whatever its status, for the DM's status filter. On a player's device it
 * holds no draft, and the filter is not shown there.
 */
export function useDeckDefinitions(deck: Deck): Subscription<Card[]> {
  const definitions = useCardsContext().definitions
  return useMemo(
    () =>
      definitions.status === 'ready'
        ? { ...definitions, data: definitions.data.filter((card) => isInDeck(card, deck)) }
        : definitions,
    [definitions, deck],
  )
}

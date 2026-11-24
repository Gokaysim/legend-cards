import { useMemo } from 'react'

import { type Deck, isInDeck, useCards, useHandCardsById } from '@/features/cards/cardsContext'
import { isInPool } from '@/features/cards/pool'
import type { HandCard } from '@/features/cards/schema'
import type { CardStatus, DeckStatus } from '@/features/cards/status'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useProfiles } from '@/features/users/usersContext'

import { holdersOf, useOpenHoldings } from './holdingsContext'
import type { Holding } from './schema'

/**
 * Every card's status from three sources: the card's holder, the open holdings (everyone holding a copy), and
 * the profiles (their names). The holder is named even before its holding arrives.
 */
export function cardStatuses(
  cards: readonly HandCard[],
  holdings: readonly Holding[],
  profiles: readonly UserProfile[],
): Map<string, CardStatus> {
  const names = new Map(profiles.map((profile) => [profile.id, profileName(profile)]))
  const byCard = new Map<string, Holding[]>()
  for (const holding of holdings) {
    const copies = byCard.get(holding.cardId)
    if (copies) copies.push(holding)
    else byCard.set(holding.cardId, [holding])
  }

  return new Map(
    cards.map((card) => {
      const { holder } = card
      const uids = holdersOf(byCard.get(card.id) ?? [], card.id)
      if (holder && !uids.includes(holder.uid)) uids.unshift(holder.uid)
      const status: CardStatus = {
        // A Custom Card never returns to a pool (spec: custom-cards, "Custom Cards are never in the pool").
        inPool: card.kind !== 'cursed' && card.kind !== 'custom' && isInPool(card),
        holderNames: uids.map((uid) => names.get(uid) ?? 'İsimsiz oyuncu'),
      }
      return [card.id, status]
    }),
  )
}

/**
 * The status of every card this device reads, live: the active ones, the retired ones still in hands, the Custom
 * Cards, and on the DM's device the drafts. `null` while the cards, the holdings or the profiles load or fail.
 */
export function useCardStatuses(): ReadonlyMap<string, CardStatus> | null {
  const cardsById = useHandCardsById()
  const holdings = useOpenHoldings()
  const profiles = useProfiles()
  return useMemo(
    () =>
      cardsById.status === 'ready' && holdings.status === 'ready' && profiles.status === 'ready'
        ? cardStatuses([...cardsById.data.values()], holdings.data, profiles.data)
        : null,
    [cardsById, holdings, profiles],
  )
}

/**
 * The status of one deck's active cards with the deck's counts, live, for the library screens. `undefined` while
 * the data loads or fails, so the browser shows the cards without a status.
 */
export function useDeckStatus(deck: Deck): DeckStatus | undefined {
  const statuses = useCardStatuses()
  const cards = useCards()
  const holdings = useOpenHoldings()
  return useMemo(() => {
    if (statuses === null || cards.status !== 'ready' || holdings.status !== 'ready') {
      return undefined
    }
    const deckCards = cards.data.filter((card) => isInDeck(card, deck))
    return {
      byCard: statuses,
      poolCount: deckCards.filter((card) => statuses.get(card.id)?.inPool).length,
      handCount: holdings.data.filter(
        (holding) =>
          holding.cardKind !== 'trueWord' &&
          holding.cardKind !== 'custom' &&
          isInDeck({ kind: holding.cardKind }, deck),
      ).length,
    }
  }, [statuses, cards, holdings, deck])
}

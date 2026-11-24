import { useCallback, useMemo } from 'react'

import { useHandCardsById } from '@/features/cards/cardsContext'
import type { HandCard } from '@/features/cards/schema'
import { useOpenHoldings } from '@/features/hands/holdingsContext'
import { useIsDm } from '@/features/users/usersContext'

/**
 * Whether the viewer may open the card's Kart geçmişi (spec: card-stats, "Who opens a card's page"): the DM every
 * card, a player an active card whose "Listede görünür" is on, and a hidden or retired card while someone holds it.
 * This is about what the interface shows: the rules let every signed-in user read these records (design D8 of
 * add-card-and-set-stats). The page and the İşlem Logu's card links share it, so a link never leads to "Kart bulunamadı.".
 */
export function canOpenCardPage(card: HandCard, isDm: boolean, isHeld: boolean): boolean {
  if (isDm) return true
  // A Custom Card is listed nowhere: its page opens from the hand that holds it, and stays open after it is gone.
  if (card.kind === 'custom') return true
  if (card.status === 'draft') return false
  return (card.status === 'active' && card.isInLibrary) || isHeld
}

/**
 * Whether the viewer may open the Kart geçmişi of the card with an ID (design D5 of link-log-players-and-cards).
 * `false` while the cards or the holdings load, and for an ID that names no card this device reads, a True Word's
 * among them. Must be used inside `<CardsProvider>` and `<HoldingsProvider>`.
 */
export function useCardPageAccess(): (cardId: string) => boolean {
  const isDm = useIsDm()
  const cardsById = useHandCardsById()
  const holdings = useOpenHoldings()
  const held = useMemo(
    () =>
      holdings.status === 'ready' ? new Set(holdings.data.map((holding) => holding.cardId)) : null,
    [holdings],
  )
  return useCallback(
    (cardId: string) => {
      if (cardsById.status !== 'ready' || held === null) return false
      const card = cardsById.data.get(cardId)
      return card !== undefined && canOpenCardPage(card, isDm, held.has(cardId))
    },
    [cardsById, held, isDm],
  )
}

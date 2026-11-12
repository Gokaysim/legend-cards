import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { CardBrowserProps } from '@/features/cards/CardBrowser'
import { type Deck, useDeckCards, useDeckDefinitions } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { useIsDm } from '@/features/users/usersContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { CardFormDialog } from './CardFormDialog'
import { type CardFilterValue, DEFAULT_STATUS_FILTER, filterCards } from './statusFilterOptions'

export type CardEditing = {
  /** The cards to browse: the active ones, or for the DM those the status filter keeps. */
  cards: Subscription<Card[]>
  /** The DM's status filter and edit control for `CardBrowser`; nothing for a player. */
  browserProps: Pick<CardBrowserProps, 'statusFilter' | 'onEdit'>
  /** The DM's "+ Kart ekle", or `null` for a player. */
  addButton: ReactNode
  /** The open card form, or `null`. */
  dialog: ReactNode
}

/**
 * The DM's card editing on a deck screen (spec: definition-editing, card-library "The DM's status filter"): the status
 * filter, "+ Kart ekle", each card's "✎ Düzenle" and the form they open. A player gets the active cards and none of
 * the controls.
 */
export function useCardEditing(deck: Deck): CardEditing {
  const isDm = useIsDm()
  const activeCards = useDeckCards(deck)
  const definitions = useDeckDefinitions(deck)
  const [filter, setFilter] = useState<CardFilterValue>(DEFAULT_STATUS_FILTER)
  // `null` while closed; `cardId: null` adds a card.
  const [editing, setEditing] = useState<{ cardId: string | null } | null>(null)

  if (!isDm) return { cards: activeCards, browserProps: {}, addButton: null, dialog: null }
  return {
    cards: filterCards(definitions, filter),
    browserProps: {
      statusFilter: { value: filter, onChange: setFilter },
      onEdit: (card) => setEditing({ cardId: card.id }),
    },
    addButton: <Button onClick={() => setEditing({ cardId: null })}>+ Kart ekle</Button>,
    dialog: editing ? (
      <CardFormDialog deck={deck} cardId={editing.cardId} onClose={() => setEditing(null)} />
    ) : null,
  }
}

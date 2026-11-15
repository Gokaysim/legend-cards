import { type ReactNode, useState } from 'react'

import type { CardBrowserProps } from '@/features/cards/CardBrowser'
import { type Deck, useDeckCards, useDeckDefinitions } from '@/features/cards/cardsContext'
import type { Card, Definition } from '@/features/cards/schema'
import { useIsDm } from '@/features/users/usersContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { CardFormDialog } from './CardFormDialog'
import { type CardFilterValue, DEFAULT_STATUS_FILTER, filterCards } from './statusFilterOptions'

/**
 * The DM's editing inside a tab of the Kütüphane, for cards (`useCardEditing`) or True Words (`useWordEditing`). Adding
 * is in the page's header (`useAddDefinition`), so it stays put while the tab's content starts afresh.
 */
export type DefinitionEditing<T extends Definition> = {
  /** The definitions to browse: the active ones, or for the DM those the status filter keeps. */
  cards: Subscription<T[]>
  /** The DM's status filter and edit control for `CardBrowser`; nothing for a player. */
  browserProps: Pick<CardBrowserProps<T>, 'statusFilter' | 'onEdit'>
  /** The open edit form, or `null`. */
  dialog: ReactNode
}

/**
 * The DM's card editing on the Kartlar or the Cursed tab (spec: definition-editing, card-library "The DM's status
 * filter"): the status filter, each card's "✎ Düzenle" and the form it opens. A player gets the active cards and none
 * of the controls.
 */
export function useCardEditing(deck: Deck): DefinitionEditing<Card> {
  const isDm = useIsDm()
  const activeCards = useDeckCards(deck)
  const definitions = useDeckDefinitions(deck)
  const [filter, setFilter] = useState<CardFilterValue>(DEFAULT_STATUS_FILTER)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!isDm) return { cards: activeCards, browserProps: {}, dialog: null }
  return {
    cards: filterCards(definitions, filter),
    browserProps: {
      statusFilter: { value: filter, onChange: setFilter },
      onEdit: (card) => setEditingId(card.id),
    },
    dialog:
      editingId === null ? null : (
        <CardFormDialog deck={deck} cardId={editingId} onClose={() => setEditingId(null)} />
      ),
  }
}

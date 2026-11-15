import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { BrowserDeck } from '@/features/cards/CardBrowser'
import { useIsDm } from '@/features/users/usersContext'

import { CardFormDialog } from './CardFormDialog'
import { WordFormDialog } from './WordFormDialog'

export type AddDefinition = {
  /** "+ Kart ekle" on the Kartlar and Cursed tabs, "+ True Word ekle" on the True Words tab; `null` for a player. */
  addButton: ReactNode
  /** The open form, or `null`. */
  dialog: ReactNode
}

/**
 * The DM's add control of a Kütüphane tab and the form it opens (spec: definition-editing, "Adding a card", "Adding a
 * True Word"): a normal or Blessed card on Kartlar, a Cursed card on Cursed, a True Word on True Words.
 */
export function useAddDefinition(deck: BrowserDeck): AddDefinition {
  const isDm = useIsDm()
  const [isAdding, setIsAdding] = useState(false)
  if (!isDm) return { addButton: null, dialog: null }
  const close = () => setIsAdding(false)
  return {
    addButton: (
      <Button onClick={() => setIsAdding(true)}>
        {deck === 'words' ? '+ True Word ekle' : '+ Kart ekle'}
      </Button>
    ),
    dialog: !isAdding ? null : deck === 'words' ? (
      <WordFormDialog wordId={null} onClose={close} />
    ) : (
      <CardFormDialog deck={deck} cardId={null} onClose={close} />
    ),
  }
}

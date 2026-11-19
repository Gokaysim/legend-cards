import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { Lore } from './schema'

/** Saving a card's lore as the signed-in DM `by`. A blank text deletes it (spec: card-lore). */
export type LoreActions = {
  saveLore: (save: { cardId: string; text: string; by: string }) => Promise<void>
}

/**
 * How a card's lore is read and saved. `LoreProvider` implements these hooks with Firestore; tests provide fixed lore
 * instead, so unit tests never load Firebase. Only the Kart geçmişi page calls them, so the one subscription exists
 * only while a card's page is open (design D3 of polish-sidebar-mascots-and-lore). A card without lore reads as `null`.
 */
export type LoreSource = {
  useLore: (cardId: string) => Subscription<Lore | null>
  actions: LoreActions
}

export const LoreContext = createContext<LoreSource | null>(null)

function useLoreSource(): LoreSource {
  const value = useContext(LoreContext)
  if (!value) throw new Error('Lore hooks must be used inside <LoreProvider>')
  return value
}

/** The lore of the card `cardId`, live. Must be used inside `<LoreProvider>`. */
export function useLore(cardId: string): Subscription<Lore | null> {
  return useLoreSource().useLore(cardId)
}

/** Saving lore. Must be used inside `<LoreProvider>`. */
export function useLoreActions(): LoreActions {
  return useLoreSource().actions
}

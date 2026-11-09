import { createContext, useContext } from 'react'

import type { PackOpening } from '@/features/draws/schema'

import type { CancelPackInput, ChoosePackCardInput, OpenPackInput } from './api'

/**
 * The pack steps of `api.ts`, bound to the app's Firestore. Components call them through `usePackActions()`, so unit
 * tests can provide fakes and never load Firebase.
 */
export type PackActions = {
  /** Resolves with the new pack's ID. */
  openPack: (input: OpenPackInput) => Promise<string>
  turnPackCard: (drawId: string, position: number) => Promise<void>
  /** Resolves with the chosen card's holding ID. */
  choosePackCard: (input: ChoosePackCardInput) => Promise<string>
  cancelPack: (input: CancelPackInput) => Promise<void>
}

export type PacksContextValue = {
  /**
   * The pack the table waits for, live; after it ends, that ended pack, until another opens. `null` before a pack
   * was seen, while it loads, and when it cannot be read.
   */
  pack: PackOpening | null
  actions: PackActions
}

export const PacksContext = createContext<PacksContextValue | null>(null)

function usePacksContext(): PacksContextValue {
  const value = useContext(PacksContext)
  if (!value) throw new Error('Pack hooks must be used inside <PacksProvider>')
  return value
}

/**
 * The open pack, live, or the last one after it ended (check its `status`). Must be used inside `<PacksProvider>`.
 */
export function useOpenPack(): PackOpening | null {
  return usePacksContext().pack
}

/** The pack steps. Must be used inside `<PacksProvider>`. */
export function usePackActions(): PackActions {
  return usePacksContext().actions
}

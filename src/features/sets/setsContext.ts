import { createContext, useContext } from 'react'

import { type ArtLookup, SET_MASCOT_PREFIX } from '@/features/art/artContext'
import type { Subscription } from '@/lib/firestore/subscription'

import type { AddSetInput, DeleteSetInput, MoveSetInput, SaveSetInput } from './api'
import { EMPTY_SET_INDEX, setIndex, type SetIndex } from './index'
import type { CardSet } from './schema'

/** The DM's set steps (spec: card-sets), bound to a Firestore and a picture store. */
export type SetActions = {
  addSet: (input: AddSetInput) => Promise<string>
  saveSet: (input: SaveSetInput) => Promise<void>
  moveSet: (input: MoveSetInput) => Promise<void>
  deleteSet: (input: DeleteSetInput) => Promise<void>
}

export type SetsContextValue = {
  /** Every stored set, in the shop order. */
  sets: Subscription<CardSet[]>
  /** How a card's set code finds its set. Empty while the sets load or fail. */
  index: SetIndex
  actions: SetActions
}

export const SetsContext = createContext<SetsContextValue | null>(null)

function useSetsContext(): SetsContextValue {
  const value = useContext(SetsContext)
  if (!value) throw new Error('Set hooks must be used inside <SetsProvider>')
  return value
}

/**
 * Builds the shared values from the one subscription to the sets. Used by `SetsProvider` and the test provider, so both
 * order and index the sets the same way.
 */
export function setsContextValue(
  sets: Subscription<CardSet[]>,
  actions: SetActions,
): SetsContextValue {
  if (sets.status !== 'ready') return { sets, index: EMPTY_SET_INDEX, actions }
  const index = setIndex(sets.data)
  return { sets: { ...sets, data: [...index.sets] }, index, actions }
}

/** Every stored set, in the shop order, live. Must be used inside `<SetsProvider>`. */
export function useSets(): Subscription<CardSet[]> {
  return useSetsContext().sets
}

/**
 * How a card's set code finds its stored set, its name and its place in the order, live. Outside a provider, or while
 * the sets load, every code shows as written.
 */
export function useSetIndex(): SetIndex {
  return useContext(SetsContext)?.index ?? EMPTY_SET_INDEX
}

/** The DM's set steps. Must be used inside `<SetsProvider>`. */
export function useSetActions(): SetActions {
  return useSetsContext().actions
}

/**
 * The pictures with the stored sets' cardbacks and Cardmakers added (design D7): `backUrl` finds a set's cardback by
 * any spelling of its code, and `setMascotUrl` (or `mascotUrl` with `setMascotStem`) its Cardmaker. Other keys keep the
 * built pictures.
 */
export function withSetPictures(art: ArtLookup, index: SetIndex): ArtLookup {
  const setMascotUrl = (setCode: string) => {
    const set = index.setOf(setCode)
    return set === undefined ? null : art.pictureUrl(set.mascot)
  }
  return {
    ...art,
    backUrl: (key) => {
      const set = index.setOf(key)
      return set === undefined ? art.backUrl(key) : art.pictureUrl(set.cardback)
    },
    mascotUrl: (stem) =>
      stem.startsWith(SET_MASCOT_PREFIX)
        ? setMascotUrl(stem.slice(SET_MASCOT_PREFIX.length))
        : art.mascotUrl(stem),
    setMascotUrl,
  }
}

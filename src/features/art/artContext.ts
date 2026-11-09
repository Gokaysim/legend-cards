import { createContext, useContext } from 'react'

import { officialSet } from '@/features/cards/sets'
import { normalize } from '@/features/cards/text'

import { type ArtManifest, EMPTY_ART } from './schema'

/** Where each picture is, or `null` when there is none: the caller then keeps its look without pictures. */
export type ArtLookup = {
  /** A card's picture, by its document ID. */
  cardUrl: (cardId: string) => string | null
  /** A True Word's picture, by its document ID. */
  wordUrl: (wordId: string) => string | null
  /** A cardback, by set code (any spelling the set is known by), `blessed` or `cursed`. */
  backUrl: (key: string) => string | null
  /** A pack's picture, by its `PackDef.key`. */
  packUrl: (key: string) => string | null
  /** A Cardmaker picture, by its stem, for example `cardmaker_lib`. */
  mascotUrl: (stem: string) => string | null
}

/** A set as a key: the official code, normalized, so "The End Is Nigh" finds "The End is Nigh". */
const setKey = (value: string) => normalize(officialSet(value)?.code ?? value)

/** A pack key with its set or mechanic pack normalized: `standard:The End Is Nigh` → `standard:theendisnigh`. */
function packKey(key: string): string {
  const colon = key.indexOf(':')
  return colon < 0 ? key : `${key.slice(0, colon)}:${setKey(key.slice(colon + 1))}`
}

/**
 * The lookups of a manifest. Its addresses are written for the site's root; `base` is where the app is served
 * (`import.meta.env.BASE_URL`).
 */
export function artLookup(manifest: ArtManifest, base = '/'): ArtLookup {
  const at = (path: string) => `${base}${path.replace(/^\//, '')}`
  const table = (
    pictures: Record<string, string>,
    toKey: (key: string) => string = (key) => key,
  ) => {
    const urls = new Map(Object.entries(pictures).map(([key, path]) => [toKey(key), at(path)]))
    return (key: string) => urls.get(toKey(key)) ?? null
  }
  return {
    cardUrl: table(manifest.cards),
    wordUrl: table(manifest.words),
    backUrl: table(manifest.cardbacks, setKey),
    packUrl: table(manifest.packs, packKey),
    mascotUrl: table(manifest.mascots),
  }
}

/** No pictures: the default, so a component rendered without a provider keeps its look without pictures. */
export const NO_ART: ArtLookup = artLookup(EMPTY_ART)

export const ArtContext = createContext<ArtLookup>(NO_ART)

/** The built pictures (`ArtProvider`). Outside a provider, or before the manifest loads, there are none. */
export function useArt(): ArtLookup {
  return useContext(ArtContext)
}

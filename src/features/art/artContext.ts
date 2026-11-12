import { createContext, useContext } from 'react'

import { officialSet } from '@/features/cards/sets'
import { normalize } from '@/features/cards/text'

import { type ArtManifest, EMPTY_ART } from './schema'

/** Where each picture is, or `null` when there is none: the caller then keeps its look without pictures. */
export type ArtLookup = {
  /**
   * A card's or True Word's picture, by the Cloud Storage path its definition holds (`card.picture`), or `null`
   * for none (design D4 of upload-card-and-word-pictures).
   */
  pictureUrl: (path: string | null) => string | null
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

/** How a stored picture's path becomes its address: `storedPictureUrl` in the app, a fake in tests. */
export type StoredPictureUrl = (path: string) => string

/**
 * The lookups of a manifest and of the stored pictures. The manifest's addresses are written for the site's root;
 * `base` is where the app is served (`import.meta.env.BASE_URL`). Without `storedUrl`, no card or word has a picture.
 */
export function artLookup(
  manifest: ArtManifest,
  base = '/',
  storedUrl: StoredPictureUrl | null = null,
): ArtLookup {
  const at = (path: string) => `${base}${path.replace(/^\//, '')}`
  const table = (
    pictures: Record<string, string>,
    toKey: (key: string) => string = (key) => key,
  ) => {
    const urls = new Map(Object.entries(pictures).map(([key, path]) => [toKey(key), at(path)]))
    return (key: string) => urls.get(toKey(key)) ?? null
  }
  return {
    pictureUrl: (path) => (path === null || storedUrl === null ? null : storedUrl(path)),
    backUrl: table(manifest.cardbacks, setKey),
    packUrl: table(manifest.packs, packKey),
    mascotUrl: table(manifest.mascots),
  }
}

/** No pictures: the default, so a component rendered without a provider keeps its look without pictures. */
export const NO_ART: ArtLookup = artLookup(EMPTY_ART)

export const ArtContext = createContext<ArtLookup>(NO_ART)

/**
 * The pictures (`ArtProvider`): the built cardbacks, packs and Cardmaker, and the stored card and word pictures.
 * Outside a provider there are none, and before the manifest loads there are no built ones.
 */
export function useArt(): ArtLookup {
  return useContext(ArtContext)
}

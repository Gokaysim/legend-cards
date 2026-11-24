import { createContext, useContext } from 'react'

import { normalize } from '@/features/cards/text'

import { type ArtManifest, EMPTY_ART } from './schema'

/** Where each picture is, or `null` when there is none: the caller then keeps its look without pictures. */
export type ArtLookup = {
  /**
   * A card's or True Word's picture, by the Cloud Storage path its definition holds (`card.picture`), or `null`
   * for none (design D4 of upload-card-and-word-pictures).
   */
  pictureUrl: (path: string | null) => string | null
  /**
   * A cardback: a stored set's own, by any spelling of its code (`SetArt` adds them, design D7 of add-set-management),
   * or the built `blessed` and `cursed` ones.
   */
  backUrl: (key: string) => string | null
  /** A pack's picture, by its `PackDef.key`. */
  packUrl: (key: string) => string | null
  /** A Cardmaker picture, by its stem: a built one, for example `cardmaker_lib`, or a set's (`setMascotStem`). */
  mascotUrl: (stem: string) => string | null
  /** A stored set's Cardmaker, by any spelling of its code, or `null` (`SetArt` adds them). */
  setMascotUrl: (setCode: string) => string | null
  /** A Custom Card's cover for its draft cost (design D6 of add-custom-card-draft). */
  customCover: (cost: number) => string | null
  /** A custom effect's picture at a cost, for example `customEffect(3, 'Caster')`. */
  customEffect: (cost: number, type: string) => string | null
}

/**
 * The Cardmaker stem of a stored set, for `mascotUrl`, `Mascot` and `CornerCardmaker`: the set's own picture, which
 * `SetArt` resolves (design D7 of add-set-management).
 */
export function setMascotStem(setCode: string): string {
  return `${SET_MASCOT_PREFIX}${setCode}`
}

/** What starts a set's Cardmaker stem. No built picture's stem starts so. */
export const SET_MASCOT_PREFIX = 'set:'

/** A key compared as set names are, so "Blessed" finds `blessed`. */
const keyOf = (value: string) => normalize(value)

/** A pack key with its mechanic pack normalized: `mechanic:Blood & Battle` → `mechanic:bloodbattle`. */
function packKey(key: string): string {
  const colon = key.indexOf(':')
  return colon < 0 ? key : `${key.slice(0, colon)}:${keyOf(key.slice(colon + 1))}`
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
  const covers = table(manifest.customCovers)
  const effects = table(manifest.customEffects)
  return {
    pictureUrl: (path) => (path === null || storedUrl === null ? null : storedUrl(path)),
    backUrl: table(manifest.cardbacks, keyOf),
    packUrl: table(manifest.packs, packKey),
    mascotUrl: table(manifest.mascots),
    setMascotUrl: () => null,
    customCover: (cost) => covers(`${cost}`),
    customEffect: (cost, type) => effects(`${cost}:${type}`),
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

import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { storedPictureUrl } from '@/lib/firebase/storage'

import { ArtContext, artLookup } from './artContext'
import { loadArtManifest } from './loadArtManifest'
import { type ArtManifest, EMPTY_ART } from './schema'

/**
 * Shares the pictures. The built cardbacks, packs and Cardmaker come from `art/manifest.json`, fetched once at start:
 * until it arrives, and when there is none, they keep their look without pictures. The card and word pictures are in
 * Cloud Storage, and their addresses are built from the paths the definitions hold, without a request.
 */
export function ArtProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<ArtManifest>(EMPTY_ART)

  useEffect(() => {
    let isCurrent = true
    const base = import.meta.env.BASE_URL
    void loadArtManifest(`${base}art/manifest.json`, fetch, (reason) => {
      if (import.meta.env.DEV) console.info(`No pictures (run npm run build-art): ${reason}`)
    }).then((loaded) => {
      if (isCurrent) setManifest(loaded)
    })
    return () => {
      isCurrent = false
    }
  }, [])

  const value = useMemo(
    () => artLookup(manifest, import.meta.env.BASE_URL, storedPictureUrl),
    [manifest],
  )
  return <ArtContext value={value}>{children}</ArtContext>
}

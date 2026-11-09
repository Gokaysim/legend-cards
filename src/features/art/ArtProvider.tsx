import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { ArtContext, artLookup } from './artContext'
import { loadArtManifest } from './loadArtManifest'
import { type ArtManifest, EMPTY_ART } from './schema'

/**
 * Shares the built pictures: fetches `art/manifest.json` once at start (design D4). Until it arrives, and when there
 * is none, every component keeps its look without pictures. Not Firestore: the pictures are static files.
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

  const value = useMemo(() => artLookup(manifest, import.meta.env.BASE_URL), [manifest])
  return <ArtContext value={value}>{children}</ArtContext>
}

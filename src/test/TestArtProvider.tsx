import { type ReactNode, useMemo } from 'react'

import { ArtContext, artLookup } from '@/features/art/artContext'
import { type ArtManifest, EMPTY_ART } from '@/features/art/schema'

export type TestArtProviderProps = {
  /** The pictures to provide. Defaults to `EMPTY_ART`: every component keeps its look without pictures. */
  manifest?: ArtManifest
  children: ReactNode
}

/** Provides a fixed picture manifest to components under test, without fetching it. */
export function TestArtProvider({ manifest = EMPTY_ART, children }: TestArtProviderProps) {
  const value = useMemo(() => artLookup(manifest), [manifest])
  return <ArtContext value={value}>{children}</ArtContext>
}

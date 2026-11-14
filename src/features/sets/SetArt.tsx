import { type ReactNode, useMemo } from 'react'

import { ArtContext, useArt } from '@/features/art/artContext'

import { useSetIndex, withSetPictures } from './setsContext'

/**
 * Re-provides the pictures with the stored sets' cardbacks and Cardmakers (design D7). `ArtProvider` sits outside the
 * sign-in and cannot read the sets, so this sits inside the sets' provider.
 */
export function SetArt({ children }: { children: ReactNode }) {
  const art = useArt()
  const index = useSetIndex()
  const value = useMemo(() => withSetPictures(art, index), [art, index])
  return <ArtContext value={value}>{children}</ArtContext>
}

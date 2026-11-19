import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { loreRef, saveLore } from './api'
import { LoreContext, type LoreSource } from './loreContext'

function useFirestoreLore(cardId: string) {
  const isSignedIn = useAuth().status === 'signedIn'
  const ref = useMemo(() => (isSignedIn ? loreRef(db, cardId) : null), [isSignedIn, cardId])
  return useDocument(ref)
}

const source: LoreSource = {
  useLore: useFirestoreLore,
  actions: { saveLore: (save) => saveLore(db, save) },
}

/**
 * Lets the Kart geçmişi page read and save a card's lore in Firestore. It subscribes to nothing itself: the page
 * subscribes to its card's lore while it is open. Mounted once in `App.tsx`.
 */
export function LoreProvider({ children }: { children: ReactNode }) {
  return <LoreContext value={source}>{children}</LoreContext>
}

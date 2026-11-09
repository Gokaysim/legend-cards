import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useOpenPackId } from '@/features/table/tableContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { cancelPack, choosePackCard, openPack, packOpeningRef, turnPackCard } from './api'
import { useLastPackId } from './lastPackId'
import { type PackActions, PacksContext, type PacksContextValue } from './packsContext'

const actions: PackActions = {
  openPack: (input) => openPack(db, input),
  turnPackCard: (drawId, position) => turnPackCard(db, drawId, position),
  choosePackCard: (input) => choosePackCard(db, input),
  cancelPack: (input) => cancelPack(db, input),
}

/**
 * Shares the open pack in real time, with one subscription for the whole app: the pack the table's lock names,
 * and after it ends the last one, so every device can show how it ended. Also gives the pack steps bound to the
 * app's Firestore. Must be inside `<TableProvider>`. Signed out, it subscribes to nothing.
 */
export function PacksProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const packId = useLastPackId(useOpenPackId())
  const ref = useMemo(() => (packId === null ? null : packOpeningRef(db, packId)), [packId])
  const subscription = useDocument(auth.status === 'signedIn' ? ref : null)
  const pack = subscription.status === 'ready' ? subscription.data : null
  const value = useMemo<PacksContextValue>(() => ({ pack, actions }), [pack])
  return <PacksContext value={value}>{children}</PacksContext>
}

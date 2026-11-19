import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { changeRole } from '@/features/users/api'
import { useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import type { Subscription } from '@/lib/firestore/subscription'
import { useCollection } from '@/lib/firestore/useCollection'

import { type AccessActions, AccessContext, type AccessContextValue } from './accessContext'
import { accessEntriesExceptRef, addEmail, removeEmail } from './api'
import type { AccessEntry } from './schema'

const actions: AccessActions = {
  add: (email) => addEmail(db, email),
  remove: (email) => removeEmail(db, email),
  changeRole: (input) => changeRole(db, input),
}

/**
 * Shares the DM's access list in real time, for the "Masaya erişim" section (design D6 of invite-only-sign-in), and
 * gives its writes. It subscribes only on the DM's device: the rules let only the DM read the list, and the addresses
 * stay private, so a player's device never sends the query. Mounted under `UsersProvider`, which knows the role.
 *
 * The query leaves out the DM's own entry, which comes from the access check instead (design D3 of
 * drop-persistent-cache-and-dm-own-entry-query): in a query, that entry could go into limbo, and a rejected limbo
 * resolution reads as a deleted entry, which would throw the DM out of the app.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const isDm = useIsDm()
  const auth = useAuth()
  const ownEntry = auth.status === 'signedIn' ? auth.ownEntry : null
  const ownEmail = ownEntry?.email ?? null
  const others = useMemo(
    () => (isDm && ownEmail !== null ? accessEntriesExceptRef(db, ownEmail) : null),
    [isDm, ownEmail],
  )
  const otherEntries = useCollection(others)
  const entries = useMemo<Subscription<AccessEntry[]>>(
    () =>
      others !== null && ownEntry !== null && otherEntries.status === 'ready'
        ? { ...otherEntries, data: [ownEntry, ...otherEntries.data] }
        : otherEntries,
    [others, ownEntry, otherEntries],
  )
  const value = useMemo<AccessContextValue>(() => ({ entries, actions }), [entries])
  return <AccessContext value={value}>{children}</AccessContext>
}

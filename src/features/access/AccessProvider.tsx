import { type ReactNode, useMemo } from 'react'

import { changeRole } from '@/features/users/api'
import { useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import { type AccessActions, AccessContext, type AccessContextValue } from './accessContext'
import { accessEntriesRef, addEmail, removeEmail } from './api'

const allEntries = accessEntriesRef(db)

const actions: AccessActions = {
  add: (email) => addEmail(db, email),
  remove: (email) => removeEmail(db, email),
  changeRole: (input) => changeRole(db, input),
}

/**
 * Shares the DM's access list in real time, for the "Masaya erişim" section (design D6 of invite-only-sign-in), and
 * gives its writes. It subscribes only on the DM's device: the rules let only the DM read the list, and the addresses
 * stay private, so a player's device never sends the query. Mounted under `UsersProvider`, which knows the role.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const isDm = useIsDm()
  const entries = useCollection(isDm ? allEntries : null)
  const value = useMemo<AccessContextValue>(() => ({ entries, actions }), [entries])
  return <AccessContext value={value}>{children}</AccessContext>
}

import { useMemo } from 'react'

import { db } from '@/lib/firebase/firestore'
import type { Subscription } from '@/lib/firestore/subscription'
import { useDocument } from '@/lib/firestore/useDocument'

import { accessEntryRef } from './api'
import type { AccessEntry } from './schema'

/**
 * The signed-in account's own access-list entry, live (design D4 of invite-only-sign-in). `email` is the account's
 * normalized address, or `null` to follow nothing. The rules let any account with a verified address read its own
 * entry, whether or not it exists, so this keeps working when the DM adds or removes the address.
 */
export function useOwnAccessEntry(email: string | null): Subscription<AccessEntry | null> {
  const ref = useMemo(() => (email ? accessEntryRef(db, email) : null), [email])
  return useDocument(ref)
}

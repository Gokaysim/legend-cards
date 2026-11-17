import type { Subscription } from '@/lib/firestore/subscription'

import type { AccessEntry } from './schema'

/** What the signed-in account's own access-list entry says about it. */
export type AccessStatus = 'checking' | 'member' | 'noAccess'

/**
 * Reads the subscription to the account's own entry (design D4 of invite-only-sign-in):
 * - no answer yet: `checking`
 * - an entry, from the server or the cache: `member`, so a member opens the app offline
 * - no entry, from the cache only: still `checking`, so a fresh device offline does not show "ekli değil" by mistake
 * - no entry, as the server has it: `noAccess`
 * - an error: still `checking`. The rules let an account with a verified address read its own entry, so a failed
 *   read is never an answer (design D2 of retry-own-access-check). `useOwnAccessCheck` retries it and never passes an
 *   error on, so this is only a safe default.
 */
export function accessStatusOf(entry: Subscription<AccessEntry | null>): AccessStatus {
  switch (entry.status) {
    case 'loading':
      return 'checking'
    case 'error':
      return 'checking'
    case 'ready':
      if (entry.data) return 'member'
      return entry.fromCache ? 'checking' : 'noAccess'
  }
}

/** Whether the server's copy of the own entry still lacks the account's link (design D5 of invite-only-sign-in). */
export function needsLink(entry: Subscription<AccessEntry | null>): boolean {
  return (
    entry.status === 'ready' &&
    entry.data !== null &&
    entry.data.uid === undefined &&
    !entry.fromCache &&
    !entry.hasPendingWrites
  )
}

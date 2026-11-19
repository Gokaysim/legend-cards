import { Timestamp } from 'firebase/firestore'

import type { AuthState, AuthUser } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import type { Subscription } from '@/lib/firestore/subscription'

/** A signed-in user for tests. */
export const testUser: AuthUser = {
  uid: 'user-1',
  displayName: 'Gökay',
  email: 'player@example.com',
  photoURL: null,
}

/** The `signedIn` state of `user`, with an own access-list entry linked to it, added at time zero. */
export function signedInAs(user: AuthUser): Extract<AuthState, { status: 'signedIn' }> {
  return {
    status: 'signedIn',
    user,
    ownEntry: { email: user.email ?? '', uid: user.uid, addedAt: Timestamp.fromMillis(0) },
  }
}

/** A profile for tests: `testUser` as a player unless overridden. */
export function testProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: testUser.uid,
    displayName: testUser.displayName,
    photoURL: null,
    role: 'player',
    createdAt: Timestamp.fromMillis(0),
    lp: 0,
    lpEntryId: null,
    diceStyle: 'galaxy',
    roleChangeId: null,
    ...overrides,
  }
}

/** A `ready` subscription result holding `data`, confirmed by the server. */
export function ready<T>(data: T): Subscription<T> {
  return { status: 'ready', data, fromCache: false, hasPendingWrites: false }
}

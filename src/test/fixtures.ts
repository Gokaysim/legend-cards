import { Timestamp } from 'firebase/firestore'

import type { AuthUser } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import type { Subscription } from '@/lib/firestore/subscription'

/** A signed-in user for tests. */
export const testUser: AuthUser = {
  uid: 'user-1',
  displayName: 'Gökay',
  email: 'player@example.com',
  photoURL: null,
}

/** A profile for tests: `testUser` as a player unless overridden. */
export function testProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: testUser.uid,
    displayName: testUser.displayName,
    photoURL: null,
    role: 'player',
    createdAt: Timestamp.fromMillis(0),
    ...overrides,
  }
}

/** A `ready` subscription result holding `data`, confirmed by the server. */
export function ready<T>(data: T): Subscription<T> {
  return { status: 'ready', data, fromCache: false, hasPendingWrites: false }
}

import type { AuthUser } from '@/features/auth/authContext'

/** A signed-in user for tests. */
export const testUser: AuthUser = {
  uid: 'user-1',
  displayName: 'Gökay',
  email: 'player@example.com',
  photoURL: null,
}

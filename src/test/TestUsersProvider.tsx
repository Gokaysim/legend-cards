import { type ReactNode, useMemo } from 'react'

import { UsersContext, type UsersContextValue } from '@/features/users/usersContext'

import { ready, testProfile } from './fixtures'

export type TestUsers = Partial<UsersContextValue>

export type TestUsersProviderProps = TestUsers & { children: ReactNode }

/**
 * Provides fixed profiles to components under test, without Firebase.
 * Defaults to `testUser` as a ready player, alone in the list.
 */
export function TestUsersProvider({ currentProfile, profiles, children }: TestUsersProviderProps) {
  const value = useMemo<UsersContextValue>(
    () => ({
      currentProfile: currentProfile ?? ready(testProfile()),
      profiles: profiles ?? ready([testProfile()]),
    }),
    [currentProfile, profiles],
  )
  return <UsersContext value={value}>{children}</UsersContext>
}

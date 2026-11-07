import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import type { Subscription } from '@/lib/firestore/subscription'
import { ready, testProfile } from '@/test/fixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type { UserProfile } from './schema'
import { sortProfiles, useIsDm } from './usersContext'

function isDmWith(currentProfile: Subscription<UserProfile | null>): boolean {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestUsersProvider currentProfile={currentProfile}>{children}</TestUsersProvider>
  )
  return renderHook(() => useIsDm(), { wrapper }).result.current
}

describe('useIsDm', () => {
  it('is true only for a loaded DM profile', () => {
    expect(isDmWith(ready(testProfile({ role: 'dm' })))).toBe(true)
  })

  it('is false for a player, a missing profile, while loading, and on an error', () => {
    expect(isDmWith(ready(testProfile()))).toBe(false)
    expect(isDmWith(ready(null))).toBe(false)
    expect(isDmWith({ status: 'loading' })).toBe(false)
    expect(
      isDmWith({ status: 'error', error: { kind: 'unknown', message: 'x', path: 'users/user-1' } }),
    ).toBe(false)
  })
})

describe('sortProfiles', () => {
  it('sorts by name with Turkish collation, unnamed profiles by their label', () => {
    const names = sortProfiles([
      testProfile({ id: 'a', displayName: 'Deniz' }),
      testProfile({ id: 'b', displayName: 'Çağla' }),
      testProfile({ id: 'c', displayName: 'Cem' }),
      testProfile({ id: 'd', displayName: 'Şule' }),
      testProfile({ id: 'e', displayName: 'Sena' }),
    ]).map((p) => p.displayName)

    expect(names).toEqual(['Cem', 'Çağla', 'Deniz', 'Sena', 'Şule'])
  })
})

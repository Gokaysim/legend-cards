import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { ready, testProfile } from '@/test/fixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { UNKNOWN_PLAYER, useStatsNames } from './statsNames'

describe('useStatsNames', () => {
  it('names every user by their profile name, each DM included, and a missing profile as unknown', () => {
    const profiles = [
      testProfile({ id: 'gokay', displayName: 'Gökay', role: 'dm' }),
      testProfile({ id: 'ayla', displayName: 'Ayla', role: 'dm' }),
      testProfile({ id: 'bora', displayName: 'Bora' }),
    ]
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestUsersProvider profiles={ready(profiles)}>{children}</TestUsersProvider>
    )
    const { result } = renderHook(() => useStatsNames(), { wrapper })

    expect(result.current.status).toBe('ready')
    expect(['gokay', 'ayla', 'bora', 'nobody'].map(result.current.nameOf)).toEqual([
      'Gökay',
      'Ayla',
      'Bora',
      UNKNOWN_PLAYER,
    ])
  })
})

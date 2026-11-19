import { describe, expect, it } from 'vitest'

import { testProfile } from '@/test/fixtures'

import { orderByPresence, withoutOffline } from './playerOrder'
import { sortProfiles } from './usersContext'

const profiles = sortProfiles(
  ['Ayla', 'Bora', 'Can', 'Deniz', 'Gökay'].map((name) =>
    testProfile({ id: name.toLowerCase(), displayName: name }),
  ),
)
const names = (list: readonly { displayName: string | null }[]) => list.map((p) => p.displayName)

// Spec: user-profiles, "Player list", scenario "Online users first".
describe('orderByPresence', () => {
  it('puts the online users first, each group in name order', () => {
    expect(names(orderByPresence(profiles, new Set(['gökay', 'can'])))).toEqual([
      'Can',
      'Gökay',
      'Ayla',
      'Bora',
      'Deniz',
    ])
  })

  it('keeps the order when nobody or everybody is online', () => {
    expect(names(orderByPresence(profiles, new Set()))).toEqual(names(profiles))
    expect(names(orderByPresence(profiles, new Set(profiles.map((p) => p.id))))).toEqual(
      names(profiles),
    )
  })
})

// Spec: user-profiles, "Hiding offline users".
describe('withoutOffline', () => {
  it('keeps only the online users', () => {
    expect(names(withoutOffline(profiles, new Set(['ayla', 'gökay']), null))).toEqual([
      'Ayla',
      'Gökay',
    ])
  })

  it('keeps the user whose hand is shown, even when offline', () => {
    expect(names(withoutOffline(profiles, new Set(['ayla']), 'can'))).toEqual(['Ayla', 'Can'])
  })
})

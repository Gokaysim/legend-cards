import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testProfile } from '@/test/fixtures'

import { accessRows } from './accessRows'
import type { AccessEntry } from './schema'

const entry = (email: string, uid?: string): AccessEntry => ({
  email,
  addedAt: Timestamp.fromMillis(0),
  ...(uid ? { uid } : {}),
})

const PROFILES = [
  testProfile({ id: 'dm', displayName: 'Zerrin', role: 'dm' }),
  testProfile({ id: 'ayla', displayName: 'Ayla' }),
  testProfile({ id: 'ilker', displayName: 'İlker' }),
]

describe('accessRows', () => {
  it('puts rows with a profile first, by name in Turkish order, then the others by address', () => {
    const rows = accessRows(
      [
        entry('zed@example.com'),
        entry('zerrin@example.com', 'dm'),
        entry('bora@example.com'),
        entry('ilker@example.com', 'ilker'),
        entry('ayla@example.com', 'ayla'),
      ],
      PROFILES,
      'zerrin@example.com',
    )
    expect(rows.map((row) => row.email)).toEqual([
      'ayla@example.com',
      'ilker@example.com',
      'zerrin@example.com',
      'bora@example.com',
      'zed@example.com',
    ])
  })

  it('joins each linked entry to its profile, and marks the DM’s own row', () => {
    const [ayla, dm, bora] = accessRows(
      [entry('ayla@example.com', 'ayla'), entry('dm@example.com', 'dm'), entry('bora@example.com')],
      PROFILES,
      'dm@example.com',
    )
    expect(ayla).toMatchObject({ profile: { displayName: 'Ayla' }, isLinked: true, isMe: false })
    expect(dm).toMatchObject({ profile: { role: 'dm' }, isMe: true })
    expect(bora).toMatchObject({ profile: null, isLinked: false, isMe: false })
  })

  it('keeps a linked entry whose profile has not loaded among the rows without a profile', () => {
    const [row] = accessRows([entry('cem@example.com', 'cem')], PROFILES, null)
    expect(row).toMatchObject({ profile: null, isLinked: true })
  })
})

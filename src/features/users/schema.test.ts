import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { userProfileSchema } from './schema'

const valid = {
  displayName: 'Çağla',
  photoURL: 'https://example.com/a.png',
  role: 'player',
  createdAt: Timestamp.fromMillis(0),
}

describe('userProfileSchema', () => {
  it('accepts a valid profile', () => {
    expect(userProfileSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a missing name and picture, and a pending creation time', () => {
    const result = userProfileSchema.safeParse({
      ...valid,
      displayName: null,
      photoURL: null,
      createdAt: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown role', () => {
    expect(userProfileSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false)
  })

  it('rejects an empty or over-long name', () => {
    expect(userProfileSchema.safeParse({ ...valid, displayName: '' }).success).toBe(false)
    expect(userProfileSchema.safeParse({ ...valid, displayName: 'x'.repeat(101) }).success).toBe(
      false,
    )
  })
})

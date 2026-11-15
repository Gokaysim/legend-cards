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

  it('reads a profile stored before Legend Points as 0 LP without an entry', () => {
    const result = userProfileSchema.parse(valid)
    expect(result.lp).toBe(0)
    expect(result.lpEntryId).toBeNull()
  })

  it('keeps stored Legend Points and their entry', () => {
    const result = userProfileSchema.parse({ ...valid, lp: 7, lpEntryId: 'entry-1' })
    expect(result.lp).toBe(7)
    expect(result.lpEntryId).toBe('entry-1')
  })

  it('reads a profile stored before dice styles with Galaxy', () => {
    expect(userProfileSchema.parse(valid).diceStyle).toBe('galaxy')
  })

  it('keeps a stored dice style, and rejects an unknown one', () => {
    expect(userProfileSchema.parse({ ...valid, diceStyle: 'walnut' }).diceStyle).toBe('walnut')
    expect(userProfileSchema.safeParse({ ...valid, diceStyle: 'gold' }).success).toBe(false)
  })

  it('rejects negative or fractional Legend Points', () => {
    expect(userProfileSchema.safeParse({ ...valid, lp: -1 }).success).toBe(false)
    expect(userProfileSchema.safeParse({ ...valid, lp: 1.5 }).success).toBe(false)
  })

  it('rejects an empty or over-long name', () => {
    expect(userProfileSchema.safeParse({ ...valid, displayName: '' }).success).toBe(false)
    expect(userProfileSchema.safeParse({ ...valid, displayName: 'x'.repeat(101) }).success).toBe(
      false,
    )
  })
})

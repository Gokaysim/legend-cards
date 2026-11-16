import { describe, expect, it } from 'vitest'

import { Timestamp } from 'firebase/firestore'

import { accessEntrySchema } from './schema'

describe('accessEntrySchema', () => {
  const addedAt = Timestamp.fromMillis(0)

  it('accepts a linked entry and an unlinked one', () => {
    expect(accessEntrySchema.parse({ addedAt, uid: 'ayla' })).toEqual({ addedAt, uid: 'ayla' })
    expect(accessEntrySchema.parse({ addedAt })).toEqual({ addedAt })
  })

  it('accepts an entry whose adding time is still pending', () => {
    expect(accessEntrySchema.safeParse({ addedAt: null }).success).toBe(true)
  })

  it('rejects a malformed entry', () => {
    expect(accessEntrySchema.safeParse({}).success).toBe(false)
    expect(accessEntrySchema.safeParse({ addedAt: '2026-11-16' }).success).toBe(false)
    expect(accessEntrySchema.safeParse({ addedAt, uid: '' }).success).toBe(false)
    expect(accessEntrySchema.safeParse({ addedAt, uid: 7 }).success).toBe(false)
  })
})

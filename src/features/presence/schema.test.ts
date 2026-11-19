import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { presenceSchema } from './schema'

describe('presenceSchema', () => {
  it.each([
    ['a server time', { lastSeen: Timestamp.fromMillis(1000) }],
    ['a pending server time', { lastSeen: null }],
  ])('accepts %s', (_case, value) => {
    expect(presenceSchema.safeParse(value).success).toBe(true)
  })

  it('drops a field it does not know, as every schema does (the rules refuse it on write)', () => {
    const result = presenceSchema.safeParse({ lastSeen: Timestamp.fromMillis(1000), extra: 1 })
    expect(result.success && Object.keys(result.data)).toEqual(['lastSeen'])
  })

  it.each([
    ['a missing time', {}],
    ['a time that is not a timestamp', { lastSeen: 1000 }],
  ])('rejects %s', (_case, value) => {
    expect(presenceSchema.safeParse(value).success).toBe(false)
  })
})

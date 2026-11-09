import { describe, expect, it } from 'vitest'

import { openPackIdOf, tableSchema } from './schema'

describe('tableSchema', () => {
  it('accepts an open pack and a free table', () => {
    expect(tableSchema.safeParse({ openPackId: 'pack-1' }).success).toBe(true)
    expect(tableSchema.safeParse({ openPackId: null }).success).toBe(true)
  })

  it('rejects an empty pack ID and a missing field', () => {
    expect(tableSchema.safeParse({ openPackId: '' }).success).toBe(false)
    expect(tableSchema.safeParse({}).success).toBe(false)
  })
})

describe('openPackIdOf', () => {
  it('reads a missing table as free', () => {
    expect(openPackIdOf(null)).toBeNull()
    expect(openPackIdOf(undefined)).toBeNull()
    expect(openPackIdOf({ openPackId: null })).toBeNull()
    expect(openPackIdOf({ openPackId: 'pack-1' })).toBe('pack-1')
  })
})

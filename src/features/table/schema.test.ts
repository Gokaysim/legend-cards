import { describe, expect, it } from 'vitest'

import { Timestamp } from 'firebase/firestore'

import { openPackIdOf, playerDrawModeOf, tableChangeSchema, tableSchema } from './schema'

describe('tableSchema', () => {
  it('accepts an open pack and a free table', () => {
    expect(tableSchema.safeParse({ openPackId: 'pack-1' }).success).toBe(true)
    expect(tableSchema.safeParse({ openPackId: null }).success).toBe(true)
  })

  it('reads a table from before the setting as mode off, without a change', () => {
    expect(tableSchema.parse({ openPackId: null })).toEqual({
      openPackId: null,
      playerDraw: 'off',
      playerDrawChangeId: null,
    })
  })

  it('accepts each mode and rejects an unknown one', () => {
    for (const mode of ['off', 'filtered', 'pick']) {
      const table = { openPackId: null, playerDraw: mode, playerDrawChangeId: 'change-1' }
      expect(tableSchema.safeParse(table).success).toBe(true)
    }
    expect(tableSchema.safeParse({ openPackId: null, playerDraw: 'all' }).success).toBe(false)
  })

  it('rejects an empty pack ID and a missing field', () => {
    expect(tableSchema.safeParse({ openPackId: '' }).success).toBe(false)
    expect(tableSchema.safeParse({}).success).toBe(false)
  })
})

describe('playerDrawModeOf', () => {
  it('reads a missing table as off', () => {
    expect(playerDrawModeOf(null)).toBe('off')
    expect(playerDrawModeOf(undefined)).toBe('off')
    expect(
      playerDrawModeOf({ openPackId: null, playerDraw: 'pick', playerDrawChangeId: 'change-1' }),
    ).toBe('pick')
  })
})

describe('tableChangeSchema', () => {
  const change = {
    by: 'dm',
    at: Timestamp.fromMillis(0),
    setting: 'playerDraw',
    before: 'off',
    after: 'filtered',
  }

  it('accepts a mode change', () => {
    expect(tableChangeSchema.safeParse(change).success).toBe(true)
    expect(tableChangeSchema.safeParse({ ...change, at: null }).success).toBe(true)
  })

  it('rejects an unknown mode or setting', () => {
    expect(tableChangeSchema.safeParse({ ...change, after: 'all' }).success).toBe(false)
    expect(tableChangeSchema.safeParse({ ...change, setting: 'lp' }).success).toBe(false)
  })
})

describe('openPackIdOf', () => {
  it('reads a missing table as free', () => {
    expect(openPackIdOf(null)).toBeNull()
    expect(openPackIdOf(undefined)).toBeNull()
    expect(openPackIdOf(tableSchema.parse({ openPackId: null }))).toBeNull()
    expect(openPackIdOf(tableSchema.parse({ openPackId: 'pack-1' }))).toBe('pack-1')
  })
})

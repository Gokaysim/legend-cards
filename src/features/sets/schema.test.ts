import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { cardSetSchema, setChangeSchema } from './schema'

const stored = {
  code: 'Kesqer',
  name: 'Kesqerian Nights',
  aliases: [],
  position: 5,
  packLayout: 'standard',
  changeId: 'c1',
}

describe('cardSetSchema', () => {
  it('reads a set that never had a picture, and one whose picture was removed, as without one', () => {
    expect(cardSetSchema.parse(stored)).toMatchObject({ cardback: null, mascot: null })
    expect(cardSetSchema.parse({ ...stored, cardback: null, mascot: null })).toMatchObject({
      cardback: null,
      mascot: null,
    })
  })

  it('reads its picture paths', () => {
    expect(
      cardSetSchema.parse({
        ...stored,
        cardback: 'sets/kesqer/0123456789.webp',
        mascot: 'sets/kesqer/abcdef0123.webp',
      }),
    ).toMatchObject({
      cardback: 'sets/kesqer/0123456789.webp',
      mascot: 'sets/kesqer/abcdef0123.webp',
    })
  })

  it.each([
    ['an unknown layout', { packLayout: 'mechanic' }],
    ['11 aliases', { aliases: Array.from({ length: 11 }, (_, i) => `alias${i}`) }],
    ['an empty name', { name: '' }],
    ['a name over 100 characters', { name: 'x'.repeat(101) }],
    ['a position that is not an integer', { position: 1.5 }],
    ['a card picture as a cardback', { cardback: 'cards/legend-a/0123456789.webp' }],
  ])('refuses %s', (_label, overrides) => {
    expect(cardSetSchema.safeParse({ ...stored, ...overrides }).success).toBe(false)
  })
})

describe('setChangeSchema', () => {
  const record = {
    by: 'dana',
    at: Timestamp.fromMillis(0),
    setId: 'kesqer',
    code: 'Kesqer',
    name: 'Kesqerian Nights',
    fields: [],
    direction: null,
    added: [],
    pictured: [],
  }

  it.each([
    { ...record, step: 'added' },
    { ...record, step: 'edited', fields: ['name', 'cardback'] },
    { ...record, step: 'moved', direction: 'up' },
    { ...record, step: 'deleted' },
    {
      ...record,
      step: 'imported',
      by: null,
      setId: null,
      code: null,
      name: null,
      added: ['Kesqerian Nights'],
      pictured: ['Kesqerian Nights'],
    },
  ])('reads a $step record', (data) => {
    expect(setChangeSchema.safeParse(data).success).toBe(true)
  })

  it('reads a pending server time, and refuses an unknown field name', () => {
    expect(setChangeSchema.safeParse({ ...record, step: 'added', at: null }).success).toBe(true)
    expect(setChangeSchema.safeParse({ ...record, step: 'edited', fields: ['code'] }).success).toBe(
      false,
    )
  })
})

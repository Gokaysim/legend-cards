import { describe, expect, it } from 'vitest'

import { cardSchema, isComplete, missingCardFields } from './schema'

const normal = {
  kind: 'normal',
  name: "Aboleth's Eyes",
  nameKey: 'abolethseyes',
  setCode: 'Kesqer',
  cost: '1',
  rarity: 'common',
  mechanicPack: 'Arcanus Divine',
  text: 'For the rest of this combat, gain Immune to any Illusion effect.',
  status: 'active',
}

const blessed = {
  kind: 'blessed',
  name: 'Dawn of Fortune',
  nameKey: 'dawnoffortune',
  setCode: null,
  cost: null,
  rarity: null,
  mechanicPack: 'Risk & Reward',
  text: 'Gain 1 LP.',
  status: 'active',
}

const cursed = {
  kind: 'cursed',
  name: 'Visions of Death',
  nameKey: 'visionsofdeath',
  setCode: null,
  cost: '1',
  rarity: null,
  mechanicPack: null,
  text: 'Held: Every hour draw a cursed card.',
  status: 'retired',
}

describe('cardSchema', () => {
  it.each([
    ['normal', normal],
    ['Blessed', blessed],
    ['Cursed', cursed],
  ])('accepts a valid %s card', (_kind, card) => {
    expect(cardSchema.safeParse(card).success).toBe(true)
  })

  it('accepts a normal card without a cost', () => {
    expect(cardSchema.safeParse({ ...normal, cost: null }).success).toBe(true)
  })

  it.each([
    [
      'a normal draft without a set, a rarity, a mechanic pack or a text',
      { ...normal, status: 'draft', setCode: null, rarity: null, mechanicPack: null, text: '' },
    ],
    [
      'a Blessed draft without a mechanic pack',
      { ...blessed, status: 'draft', mechanicPack: null },
    ],
    ['a Cursed draft without a text', { ...cursed, status: 'draft', text: '' }],
  ])('accepts %s', (_case, card) => {
    expect(cardSchema.safeParse(card).success).toBe(true)
  })

  it('reads a card stored before definition editing as having no change record', () => {
    expect(cardSchema.parse(normal).changeId).toBeNull()
    expect(cardSchema.parse({ ...normal, changeId: 'c1' }).changeId).toBe('c1')
  })

  it('ignores fields added by later changes', () => {
    const result = cardSchema.safeParse({ ...normal, holder: null, imageUrl: null })
    expect(result.success).toBe(true)
  })

  it.each([
    ['normal', normal],
    ['Blessed', blessed],
    ['Cursed', cursed],
  ])('reads a stored %s card without a holder as being in the pool', (_kind, card) => {
    expect(cardSchema.parse(card).holder).toBeNull()
  })

  it('accepts a held normal card', () => {
    const holder = { uid: 'ayla', userCardId: 'holding-1' }
    expect(cardSchema.parse({ ...normal, holder }).holder).toEqual(holder)
  })

  it.each([
    ['a Blessed card with a rarity', { ...blessed, rarity: 'rare' }],
    ['a Blessed card with a set code', { ...blessed, setCode: 'Kesqer' }],
    ['a Cursed card with a set code', { ...cursed, setCode: 'Cursed' }],
    ['a Cursed card with a mechanic pack', { ...cursed, mechanicPack: 'Risk & Reward' }],
    ['a Cursed card with a rarity', { ...cursed, rarity: 'common' }],
    ['an unknown kind', { ...normal, kind: 'legendary' }],
    ['a rarity other than common or rare', { ...normal, rarity: 'Common' }],
    ['an active normal card without a set code', { ...normal, setCode: null }],
    ['an active normal card without a rarity', { ...normal, rarity: null }],
    ['an active normal card without a mechanic pack', { ...normal, mechanicPack: null }],
    ['an active card with an empty text', { ...normal, text: '' }],
    [
      'a retired Blessed card without a mechanic pack',
      { ...blessed, status: 'retired', mechanicPack: null },
    ],
    ['a retired Cursed card with an empty text', { ...cursed, text: '' }],
    ['an empty name', { ...normal, name: '' }],
    ['an empty cost string', { ...normal, cost: '' }],
    ['a missing status', { ...normal, status: undefined }],
    ['the old retired flag in place of a status', { ...normal, status: undefined, retired: false }],
    ['an unknown status', { ...normal, status: 'hidden' }],
    ['a Blessed card with a holder', { ...blessed, holder: { uid: 'ayla', userCardId: 'h1' } }],
    ['a Cursed card with a holder', { ...cursed, holder: { uid: 'ayla', userCardId: 'h1' } }],
    ['a holder without a holding', { ...normal, holder: { uid: 'ayla' } }],
    ['a holder with an empty user', { ...normal, holder: { uid: '', userCardId: 'h1' } }],
  ])('rejects %s', (_case, card) => {
    expect(cardSchema.safeParse(card).success).toBe(false)
  })
})

describe('missingCardFields', () => {
  const card = (overrides: Partial<Parameters<typeof missingCardFields>[0]>) => ({
    kind: 'normal' as const,
    setCode: 'Kesqer',
    rarity: 'common' as const,
    mechanicPack: 'Arcanus Divine',
    text: 'Text.',
    ...overrides,
  })

  it('finds nothing missing in a complete normal card, even without a cost', () => {
    expect(missingCardFields(card({}))).toEqual([])
    expect(isComplete(card({}))).toBe(true)
  })

  it('names every required field a normal card leaves empty', () => {
    const empty = card({ setCode: null, rarity: null, mechanicPack: null, text: '' })
    expect(missingCardFields(empty)).toEqual(['setCode', 'rarity', 'mechanicPack', 'text'])
    expect(isComplete(empty)).toBe(false)
  })

  it('needs only a mechanic pack and a text for a Blessed card', () => {
    expect(missingCardFields(card({ kind: 'blessed', setCode: null, rarity: null }))).toEqual([])
    expect(
      missingCardFields(card({ kind: 'blessed', setCode: null, rarity: null, mechanicPack: null })),
    ).toEqual(['mechanicPack'])
  })

  it('needs only a text for a Cursed card', () => {
    const cursedCard = card({ kind: 'cursed', setCode: null, rarity: null, mechanicPack: null })
    expect(missingCardFields(cursedCard)).toEqual([])
    expect(missingCardFields({ ...cursedCard, text: '' })).toEqual(['text'])
  })
})

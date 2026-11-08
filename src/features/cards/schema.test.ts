import { describe, expect, it } from 'vitest'

import { cardSchema } from './schema'

const normal = {
  kind: 'normal',
  name: "Aboleth's Eyes",
  nameKey: 'abolethseyes',
  setCode: 'Kesqer',
  cost: '1',
  rarity: 'common',
  mechanicPack: 'Arcanus Divine',
  text: 'For the rest of this combat, gain Immune to any Illusion effect.',
  retired: false,
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
  retired: false,
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
  retired: true,
}

describe('cardSchema', () => {
  it.each([
    ['normal', normal],
    ['Blessed', blessed],
    ['Cursed', cursed],
  ])('accepts a valid %s card', (_kind, card) => {
    expect(cardSchema.safeParse(card).success).toBe(true)
  })

  it('accepts a normal card without a cost or a mechanic pack', () => {
    expect(cardSchema.safeParse({ ...normal, cost: null, mechanicPack: null }).success).toBe(true)
  })

  it('ignores fields added by later changes', () => {
    const result = cardSchema.safeParse({ ...normal, holder: null, imageUrl: null })
    expect(result.success).toBe(true)
  })

  it.each([
    ['a Blessed card with a rarity', { ...blessed, rarity: 'rare' }],
    ['a Blessed card with a set code', { ...blessed, setCode: 'Kesqer' }],
    ['a Cursed card with a set code', { ...cursed, setCode: 'Cursed' }],
    ['a Cursed card with a mechanic pack', { ...cursed, mechanicPack: 'Risk & Reward' }],
    ['a Cursed card with a rarity', { ...cursed, rarity: 'common' }],
    ['an unknown kind', { ...normal, kind: 'legendary' }],
    ['a rarity other than common or rare', { ...normal, rarity: 'Common' }],
    ['a normal card without a set code', { ...normal, setCode: null }],
    ['an empty name', { ...normal, name: '' }],
    ['an empty cost string', { ...normal, cost: '' }],
    ['a missing retired flag', { ...normal, retired: undefined }],
  ])('rejects %s', (_case, card) => {
    expect(cardSchema.safeParse(card).success).toBe(false)
  })
})

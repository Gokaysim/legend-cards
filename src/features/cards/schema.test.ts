import { describe, expect, it } from 'vitest'

import { startingFlags } from '@/features/definitions/flags'

import {
  definitionSchema as cardSchema,
  isComplete,
  isWordComplete,
  missingCardFields,
  missingWordFields,
} from './schema'

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
  ...startingFlags('normal', ''),
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
  ...startingFlags('blessed', ''),
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
  ...startingFlags('cursed', 'Held: Every hour draw a cursed card.'),
}

const word = {
  kind: 'trueWord',
  name: 'Abyss',
  nameKey: 'abyss',
  setCode: null,
  cost: '5',
  rarity: null,
  mechanicPack: null,
  text: 'Once per turn, a random card of yours is free to play.',
  status: 'active',
  ...startingFlags('trueWord', ''),
}

describe('cardSchema', () => {
  it('reads a card without a picture field as having no picture', () => {
    expect(cardSchema.parse(normal).picture).toBeNull()
  })

  it.each([
    ['a removed picture', null],
    ['a stored picture', 'cards/legend-abolethseyes/93e6f39a91.webp'],
  ])('accepts %s', (_case, picture) => {
    expect(cardSchema.parse({ ...normal, picture }).picture).toBe(picture)
  })

  it.each([
    ['an address', 'https://example.com/aboleth.webp'],
    ['a PNG', 'cards/legend-abolethseyes/93e6f39a91.png'],
    ['a short hash', 'cards/legend-abolethseyes/93e6f39a9.webp'],
    ['another folder', 'backs/legend-abolethseyes/93e6f39a91.webp'],
    ['an empty path', ''],
  ])('rejects %s as a picture', (_case, picture) => {
    expect(cardSchema.safeParse({ ...normal, picture }).success).toBe(false)
  })

  it.each([
    ['normal', normal],
    ['Blessed', blessed],
    ['Cursed', cursed],
    ['True Word', word],
  ])('accepts a valid %s definition', (_kind, card) => {
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

  it('accepts a True Word draft without a cost or a text', () => {
    expect(cardSchema.safeParse({ ...word, status: 'draft', cost: null, text: '' }).success).toBe(
      true,
    )
  })

  it('accepts a repeatable normal card and a Blessed card with one copy', () => {
    expect(cardSchema.safeParse({ ...normal, isRepeatable: true }).success).toBe(true)
    const holder = { uid: 'ayla', userCardId: 'h1' }
    expect(cardSchema.safeParse({ ...blessed, isRepeatable: false, holder }).success).toBe(true)
    expect(cardSchema.safeParse({ ...cursed, isRepeatable: false, holder }).success).toBe(true)
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
    ['True Word', word],
  ])('reads a stored %s definition without a holder as being in the pool', (_kind, card) => {
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
    [
      'a repeatable Blessed card with a holder',
      { ...blessed, holder: { uid: 'ayla', userCardId: 'h1' } },
    ],
    [
      'a repeatable Cursed card with a holder',
      { ...cursed, holder: { uid: 'ayla', userCardId: 'h1' } },
    ],
    [
      'a repeatable normal card with a holder',
      { ...normal, isRepeatable: true, holder: { uid: 'ayla', userCardId: 'h1' } },
    ],
    ['a True Word with a holder', { ...word, holder: { uid: 'ayla', userCardId: 'h1' } }],
    ['a card without a flag', { ...normal, isInDraws: undefined }],
    ['a flag that is not a boolean', { ...normal, isInLibrary: 'yes' }],
    ['a Cursed card in set packs', { ...cursed, isInSetPacks: true }],
    ['a Cursed card in Mechanic Packs', { ...cursed, isInMechanicPacks: true }],
    ['a True Word in set packs', { ...word, isInSetPacks: true }],
    ['a True Word with one copy', { ...word, isRepeatable: false }],
    ['a True Word that leaves the hand', { ...word, isKeptOnUse: false }],
    ['a True Word with a set code', { ...word, setCode: 'Kesqer' }],
    ['an active True Word without a cost', { ...word, cost: null }],
    ['the removed DM-only flag', { ...normal, dmOnly: true, isInDraws: undefined }],
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

describe('missingWordFields', () => {
  it('needs a cost and a text', () => {
    expect(missingWordFields({ cost: '1', text: 'Text.' })).toEqual([])
    expect(isWordComplete({ cost: '1', text: 'Text.' })).toBe(true)
    expect(missingWordFields({ cost: null, text: '' })).toEqual(['cost', 'text'])
    expect(isWordComplete({ cost: null, text: 'Text.' })).toBe(false)
  })
})

describe('True Word definitions', () => {
  it.each([
    ['an X cost', { ...word, cost: 'X' }],
    ['a retired word', { ...word, status: 'retired' }],
    ['a change record', { ...word, changeId: 'c1' }],
    ['a picture', { ...word, picture: 'words/tw-abyss/abcdef0123.webp' }],
    ['a removed picture', { ...word, picture: null }],
  ])('accepts %s', (_case, definition) => {
    expect(cardSchema.safeParse(definition).success).toBe(true)
  })

  it.each([
    ['an empty cost', { ...word, cost: '' }],
    ['a cost over 10 characters', { ...word, cost: '12345678901' }],
    ['an active word with an empty text', { ...word, text: '' }],
    ['a retired word without a cost', { ...word, status: 'retired', cost: null }],
    ['a picture that is not a stored path', { ...word, picture: 'twabyss.png' }],
  ])('rejects %s', (_case, definition) => {
    expect(cardSchema.safeParse(definition).success).toBe(false)
  })

  it('reads a word without a picture field as having no picture', () => {
    expect(cardSchema.parse(word).picture).toBeNull()
  })
})

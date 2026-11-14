import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testSetIndex, testSetName } from '@/test/setFixtures'

import { matchesFilters } from './filters'
import {
  activeFilters,
  cursedPool,
  type DrawFilters,
  drawablePool,
  isDrawable,
  NO_FILTERS,
  poolDistribution,
} from './pool'
import type { Card } from './schema'

const pool = testCard("Aboleth's Eyes")
const held = testCard('Greedy Hands', { holder: { uid: 'ayla', userCardId: 'h1' } })
const retired = testCard('Old Card', { status: 'retired' })
const blessed = testBlessedCard('Second Wind')
const retiredBlessed = testBlessedCard('Old Blessing', { status: 'retired' })
const cursed = testCursedCard('Visions of Death')
const retiredCursed = testCursedCard('Old Curse', { status: 'retired' })
const draft = testCard('New Card', { status: 'draft' })
const draftBlessed = testBlessedCard('New Blessing', { status: 'draft' })
const draftCursed = testCursedCard('New Curse', { status: 'draft' })
const dmOnly = testCard('The Last Wish', { dmOnly: true })
const dmOnlyBlessed = testBlessedCard('Secret Blessing', { dmOnly: true })
const dmOnlyCursed = testCursedCard('Crown of Ash', { dmOnly: true })

const filtered = (filters: Partial<DrawFilters>) => (card: Card) =>
  matchesFilters(card, { ...NO_FILTERS, ...filters }, testSetIndex)

describe('the pool', () => {
  it('holds the active normal cards without a holder and every active Blessed card', () => {
    expect(isDrawable(pool)).toBe(true)
    expect(isDrawable(blessed)).toBe(true)
    expect(isDrawable(held)).toBe(false)
    expect(isDrawable(retired)).toBe(false)
    expect(isDrawable(retiredBlessed)).toBe(false)
    expect(isDrawable(cursed)).toBe(false)
    expect(isDrawable(draft)).toBe(false)
    expect(isDrawable(draftBlessed)).toBe(false)
    const all = [
      pool,
      held,
      retired,
      draft,
      blessed,
      retiredBlessed,
      draftBlessed,
      cursed,
      retiredCursed,
    ]
    expect(drawablePool(all)).toEqual([pool, blessed])
  })

  it('keeps a Blessed card drawable while someone holds a copy', () => {
    // Blessed cards never get a holder: their holdings leave the card alone.
    expect(drawablePool([blessed, blessed])).toHaveLength(2)
  })

  it('gives the Cursed Deck its active Cursed cards', () => {
    expect(cursedPool([pool, blessed, cursed, retiredCursed, draftCursed])).toEqual([cursed])
  })

  it('never holds a DM-only card, of any kind', () => {
    expect(isDrawable(dmOnly)).toBe(false)
    expect(isDrawable(dmOnlyBlessed)).toBe(false)
    expect(drawablePool([pool, dmOnly, blessed, dmOnlyBlessed])).toEqual([pool, blessed])
    expect(cursedPool([cursed, dmOnlyCursed])).toEqual([cursed])
  })
})

describe('matchesFilters', () => {
  const rare = testCard('Blood Rite', {
    rarity: 'rare',
    cost: '2',
    mechanicPack: 'Blood & Battle',
    text: 'Deal damage. [bleed]',
  })
  const costX = testCard('Wild Surge', { cost: ' X ' })
  const costD6 = testCard('Dice Roll', { cost: 'd6' })

  it('passes every card without filters', () => {
    expect([pool, rare, blessed].every(filtered({}))).toBe(true)
  })

  it('filters by the written cost, trimmed and ignoring case', () => {
    expect([pool, rare, costX, costD6].filter(filtered({ cost: '2' }))).toEqual([rare])
    expect([pool, costX, costD6].filter(filtered({ cost: 'x' }))).toEqual([costX])
    expect([pool, costX, costD6].filter(filtered({ cost: 'D6' }))).toEqual([costD6])
    expect(filtered({ cost: '1' })(blessed)).toBe(false)
  })

  it('filters by mechanic pack', () => {
    expect([pool, rare, blessed].filter(filtered({ mechanicPack: 'Blood & Battle' }))).toEqual([
      rare,
    ])
  })

  it('filters by rarity, with Blessed as its own rarity', () => {
    expect([pool, rare, blessed].filter(filtered({ rarity: 'common' }))).toEqual([pool])
    expect([pool, rare, blessed].filter(filtered({ rarity: 'rare' }))).toEqual([rare])
    expect([pool, rare, blessed].filter(filtered({ rarity: 'blessed' }))).toEqual([blessed])
  })

  it('matches the keyword as the library search does, hidden bracket text included', () => {
    expect([pool, rare].filter(filtered({ keyword: 'bleed' }))).toEqual([rare])
    expect([pool, rare].filter(filtered({ keyword: 'ABOLETH' }))).toEqual([pool])
    expect([pool, rare].filter(filtered({ keyword: 'blood, damage' }))).toEqual([rare])
    expect([pool, blessed].filter(filtered({ keyword: 'blessed' }))).toEqual([blessed])
  })

  it('filters by set through the stored set, its code or an alias, never giving a Blessed card', () => {
    const kesqer = testCard('Desert Wind', { setCode: 'Kesqer' })
    const nigh = testCard('Last Hour', { setCode: 'The End Is Nigh' })
    const alias = testCard('Final Bell', { setCode: 'endisnigh' })
    const unknown = testCard('Odd One', { setCode: 'Atlantis' })
    const cards = [kesqer, nigh, alias, unknown, blessed]
    expect(cards.filter(filtered({ setCode: 'Kesqer' }))).toEqual([kesqer])
    expect(cards.filter(filtered({ setCode: 'The End is Nigh' }))).toEqual([nigh, alias])
    expect(cards.filter(filtered({ setCode: 'Atlantis' }))).toEqual([unknown])
    expect(cards.filter(filtered({ setCode: 'Blessed' }))).toEqual([])
  })

  it('combines filters', () => {
    const cards = [pool, rare, blessed, costX]
    expect(cards.filter(filtered({ rarity: 'rare', cost: '2', keyword: 'rite' }))).toEqual([rare])
    expect(cards.filter(filtered({ rarity: 'rare', cost: '1' }))).toEqual([])
  })
})

describe('activeFilters', () => {
  it('drops blank values, and gives null without any filter', () => {
    expect(activeFilters(NO_FILTERS)).toBeNull()
    expect(activeFilters({ ...NO_FILTERS, keyword: '   ', cost: '' })).toBeNull()
    expect(activeFilters({ ...NO_FILTERS, keyword: ' kan ', rarity: 'rare' })).toEqual({
      ...NO_FILTERS,
      keyword: 'kan',
      rarity: 'rare',
    })
  })

  it('keeps a set as a filter on its own', () => {
    expect(activeFilters({ ...NO_FILTERS, setCode: ' Kesqer ' })).toEqual({
      ...NO_FILTERS,
      setCode: 'Kesqer',
    })
  })
})

describe('poolDistribution', () => {
  const many = (count: number, make: (index: number) => Card) =>
    Array.from({ length: count }, (_, index) => make(index))

  it('counts and shares each rarity and set over the drawable cards', () => {
    const cards = [
      ...many(300, (i) => testCard(`Common ${i}`, { setCode: i < 200 ? 'Pentagon' : 'Kesqer' })),
      ...many(100, (i) =>
        testCard(`Rare ${i}`, { rarity: 'rare', setCode: i < 60 ? 'Kesqer' : 'Pentagon' }),
      ),
      ...many(20, (i) => testBlessedCard(`Blessed ${i}`)),
      held,
      retired,
      cursed,
    ]
    expect(poolDistribution(cards, testSetName)).toEqual({
      total: 420,
      rarities: [
        {
          label: 'Common',
          count: 300,
          share: '%71,4',
          sets: [
            { label: 'Conclave at Pentagon', count: 200 },
            { label: 'Kesqerian Nights', count: 100 },
          ],
        },
        {
          label: 'Rare',
          count: 100,
          share: '%23,8',
          sets: [
            { label: 'Kesqerian Nights', count: 60 },
            { label: 'Conclave at Pentagon', count: 40 },
          ],
        },
        { label: 'Blessed', count: 20, share: '%4,8', sets: [{ label: 'Blessed', count: 20 }] },
      ],
      sets: [
        { label: 'Conclave at Pentagon', count: 240, share: '%57,1' },
        { label: 'Kesqerian Nights', count: 160, share: '%38,1' },
        { label: 'Blessed', count: 20, share: '%4,8' },
      ],
    })
  })

  it('orders equal counts by name', () => {
    const cards = [
      testCard('A', { rarity: 'rare', setCode: 'Pentagon' }),
      testCard('B', { setCode: 'Ashavir' }),
    ]
    const { rarities, sets } = poolDistribution(cards, testSetName)
    expect(rarities.map((rarity) => rarity.label)).toEqual(['Common', 'Rare'])
    expect(sets.map((set) => set.label)).toEqual([
      'Conclave at Pentagon',
      'The Overlord of Ashavir',
    ])
    expect(sets[0]?.share).toBe('%50')
  })

  it('is empty for an empty pool', () => {
    expect(poolDistribution([held, retired, cursed], testSetName)).toEqual({
      total: 0,
      rarities: [],
      sets: [],
    })
  })

  it('leaves the DM-only cards out', () => {
    expect(poolDistribution([pool, dmOnly, dmOnlyBlessed], testSetName).total).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testSetIndex, testSetName } from '@/test/setFixtures'

import {
  applyFacets,
  costFacet,
  drawFacets,
  facetChoices,
  type FacetKey,
  type FacetValues,
  giveFacets,
  keywordTest,
  mechanicPackFacet,
} from './filters'
import type { Card } from './schema'

const draw = drawFacets(testSetIndex)
const give = giveFacets(testSetIndex)

const kesqerRare = testCard('Desert Rite', {
  setCode: 'Kesqer',
  rarity: 'rare',
  cost: '1',
  mechanicPack: 'Risk & Reward',
})
const kesqerRare2 = testCard('Sand Oath', {
  setCode: 'Kesqer',
  rarity: 'rare',
  cost: '2',
  mechanicPack: 'Legends of Old',
})
const kesqerCommon = testCard('Market Day', {
  setCode: 'kesqer',
  rarity: 'common',
  cost: '1',
  mechanicPack: 'Horn of Plenty',
  text: 'Draw a card.',
})
const havenRare = testCard('Harbor Light', {
  setCode: 'Havenholm',
  rarity: 'rare',
  cost: '5',
  mechanicPack: 'Permamancy',
})
const blessed = testBlessedCard('Second Wind', { mechanicPack: 'Risk & Reward' })
const cursed = testCursedCard('Visions of Death', { cost: '3' })
const cards: Card[] = [kesqerRare, kesqerRare2, kesqerCommon, havenRare, blessed]

const counts = (
  facets: typeof draw,
  values: FacetValues,
  key: FacetKey,
  list: readonly Card[] = cards,
  test?: (card: Card) => boolean,
) =>
  Object.fromEntries(
    facetChoices(list, facets, values, key, test).map((choice) => [choice.label, choice.count]),
  )

describe('applyFacets', () => {
  it('keeps the cards that pass every chosen facet and the test', () => {
    expect(applyFacets(cards, draw, { set: 'Kesqer', rarity: 'rare' })).toEqual([
      kesqerRare,
      kesqerRare2,
    ])
    expect(applyFacets(cards, draw, { set: 'Kesqer' }, keywordTest('draw', testSetName))).toEqual([
      kesqerCommon,
    ])
    expect(applyFacets(cards, draw, {})).toEqual(cards)
  })

  it('never gives a Blessed card under a set', () => {
    expect(applyFacets(cards, draw, { set: 'Kesqer' })).not.toContain(blessed)
  })
})

describe('facetChoices', () => {
  it('counts each choice with every other chosen facet applied', () => {
    expect(counts(draw, { set: 'Kesqer' }, 'rarity')).toEqual({ Common: 1, Rare: 2, Blessed: 0 })
    expect(counts(draw, { set: 'Kesqer', rarity: 'rare' }, 'cost')).toEqual({
      '1': 1,
      '2': 1,
      '5': 0,
    })
    // A facet's own choice does not narrow its own counts.
    expect(counts(draw, { set: 'Kesqer' }, 'set')).toEqual({
      'Kesqerian Nights': 3,
      'Throne of Havenholm': 1,
    })
  })

  it('applies the keyword test to the counts', () => {
    expect(counts(draw, {}, 'set', cards, keywordTest('draw', testSetName))).toEqual({
      'Kesqerian Nights': 1,
      'Throne of Havenholm': 0,
    })
  })

  it('keeps a chosen value listed with 0 when no card has it', () => {
    expect(facetChoices(cards, draw, { cost: '7' }, 'cost').at(-1)).toEqual({
      value: '7',
      label: '7',
      count: 0,
    })
    expect(facetChoices(cards, draw, { set: 'Ulagal' }, 'set').at(-1)).toEqual({
      value: 'Ulagal',
      label: 'Ballad of Ulagal',
      count: 0,
    })
  })

  it('orders costs with numbers first, then "X" and "d6"', () => {
    const list = [
      testCard('A', { cost: '10' }),
      testCard('B', { cost: '2' }),
      testCard('C', { cost: 'X' }),
      testCard('D', { cost: 'd6' }),
      testCard('E', { cost: '0' }),
      testCard('F', { cost: 'x' }),
    ]
    expect(costFacet.choices(list).map((choice) => choice.value)).toEqual([
      '0',
      '2',
      '10',
      'd6',
      'X',
    ])
  })

  it('orders mechanic packs alphabetically in Turkish', () => {
    const list = [
      testCard('A', { mechanicPack: 'Risk & Reward' }),
      testCard('B', { mechanicPack: 'Çılgın Bilim' }),
      testCard('C', { mechanicPack: 'Arcanus Divine' }),
    ]
    expect(mechanicPackFacet.choices(list).map((choice) => choice.value)).toEqual([
      'Arcanus Divine',
      'Çılgın Bilim',
      'Risk & Reward',
    ])
  })

  it('lists sets in the shop order by their names, without "Blessed"', () => {
    expect(facetChoices(cards, draw, {}, 'set').map((choice) => choice.value)).toEqual([
      'Kesqer',
      'Havenholm',
    ])
  })

  it("gives the give dialog's kinds, Cursed included, and a pool-only test", () => {
    const all = [...cards, cursed]
    expect(counts(give, {}, 'kind', all)).toEqual({ Common: 1, Rare: 3, Blessed: 1, Cursed: 1 })
    expect(applyFacets(all, give, { kind: 'cursed' })).toEqual([cursed])
    const inPool = new Set([kesqerRare.id, blessed.id])
    const poolOnly = (card: Card) => inPool.has(card.id)
    expect(applyFacets(all, give, {}, poolOnly)).toEqual([kesqerRare, blessed])
    expect(counts(give, {}, 'kind', all, poolOnly)).toEqual({
      Common: 0,
      Rare: 1,
      Blessed: 1,
      Cursed: 0,
    })
  })
})

import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import { sortCards } from './sort'

const names = (cards: { name: string }[]) => cards.map((card) => card.name)

describe('sortCards by cost', () => {
  const cards = [
    testCard('Six', { cost: '6' }),
    testCard('Zero B', { cost: '0' }),
    testCard('Ten', { cost: '10' }),
    testCard('X Cost', { cost: 'X' }),
    testCard('No Cost', { cost: null }),
    testCard('Two', { cost: '2' }),
    testCard('Zero A', { cost: '0' }),
    testCard('Dice', { cost: 'd6' }),
    testBlessedCard('Blessed One'),
  ]

  it('orders numeric costs as numbers, ties by name, and cards without a cost last', () => {
    expect(names(sortCards(cards, { key: 'cost', direction: 'asc' }))).toEqual([
      'Zero A',
      'Zero B',
      'Two',
      'Six',
      'Ten',
      'Dice',
      'X Cost',
      'Blessed One',
      'No Cost',
    ])
  })

  it('reverses the order, still with ties by name and cards without a cost last', () => {
    expect(names(sortCards(cards, { key: 'cost', direction: 'desc' }))).toEqual([
      'X Cost',
      'Dice',
      'Ten',
      'Six',
      'Two',
      'Zero A',
      'Zero B',
      'Blessed One',
      'No Cost',
    ])
  })
})

describe('sortCards by other columns', () => {
  it('orders names in Turkish alphabetical order', () => {
    const cards = [testCard('Zor'), testCard('Çelik'), testCard('Cesur'), testCard('Ağır')]
    expect(names(sortCards(cards, { key: 'name', direction: 'asc' }))).toEqual([
      'Ağır',
      'Cesur',
      'Çelik',
      'Zor',
    ])
  })

  it('orders numbers inside names numerically', () => {
    const cards = [testCard('Card 10'), testCard('Card 2')]
    expect(names(sortCards(cards, { key: 'name', direction: 'asc' }))).toEqual([
      'Card 2',
      'Card 10',
    ])
  })

  it('orders the set column by the official names, with Blessed among them', () => {
    const cards = [
      testCard('From Kesqer', { setCode: 'Kesqer' }),
      testCard('From Ashavir', { setCode: 'Ashavir' }),
      testBlessedCard('Halo'),
    ]
    // Blessed, Kesqerian Nights, The Overlord of Ashavir
    expect(names(sortCards(cards, { key: 'set', direction: 'asc' }))).toEqual([
      'Halo',
      'From Kesqer',
      'From Ashavir',
    ])
  })

  it('orders the text column by the visible text', () => {
    const cards = [testCard('B', { text: 'Beta.' }), testCard('A', { text: '[zzz] Alpha.' })]
    expect(names(sortCards(cards, { key: 'text', direction: 'asc' }))).toEqual(['A', 'B'])
  })

  it('puts cards without a rarity or mechanic pack last in both directions', () => {
    const cards = [
      testCursedCard('Hex'),
      testCard('Rare One', { rarity: 'rare' }),
      testCard('Common One'),
    ]
    expect(names(sortCards(cards, { key: 'rarity', direction: 'asc' }))).toEqual([
      'Common One',
      'Rare One',
      'Hex',
    ])
    expect(names(sortCards(cards, { key: 'rarity', direction: 'desc' }))).toEqual([
      'Rare One',
      'Common One',
      'Hex',
    ])
    expect(names(sortCards(cards, { key: 'mechanicPack', direction: 'desc' })).at(-1)).toBe('Hex')
  })

  it('leaves the input untouched', () => {
    const cards = [testCard('B'), testCard('A')]
    sortCards(cards, { key: 'name', direction: 'asc' })
    expect(names(cards)).toEqual(['B', 'A'])
  })
})

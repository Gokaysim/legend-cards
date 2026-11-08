import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import { cardHaystack, cardMatchesQuery, kindLabel, rarityLabel, setLabel } from './display'
import { normalize, searchTerms, visibleText } from './text'

describe('normalize', () => {
  it.each([
    ["Brünn's Batallion", 'brunnsbatallion'],
    ["Al-Hızran's Hazard", 'alhizranshazard'],
    ["Åge's Acumen", 'agesacumen'],
    ['Ragnarök: Nordhallr', 'ragnaroknordhallr'],
  ])('turns %j into %j', (input, expected) => {
    expect(normalize(input)).toBe(expected)
  })
})

describe('visibleText', () => {
  it('hides bracket metadata', () => {
    expect(visibleText('[Uno] Add +10 a d20 roll. If this is your only card, add +20.')).toBe(
      'Add +10 a d20 roll. If this is your only card, add +20.',
    )
  })

  it('tidies the spaces a bracket leaves in the middle of a text', () => {
    expect(visibleText('Gain 1 LP [legend]  and draw.')).toBe('Gain 1 LP and draw.')
  })

  it('keeps line breaks and texts without brackets', () => {
    expect(visibleText('First line.\nSecond line.')).toBe('First line.\nSecond line.')
  })
})

describe('searchTerms', () => {
  it('splits at commas and semicolons and drops empty terms', () => {
    expect(searchTerms('discard, draw; ;Blood & Battle')).toEqual([
      'discard',
      'draw',
      'bloodbattle',
    ])
    expect(searchTerms('  ')).toEqual([])
  })
})

describe('card labels', () => {
  it('shows the official set name, "Blessed", or nothing for a Cursed card', () => {
    expect(setLabel(testCard('A', { setCode: 'Kesqer' }))).toBe('Kesqerian Nights')
    expect(setLabel(testCard('A', { setCode: 'Kesqeria' }))).toBe('Kesqeria')
    expect(setLabel(testBlessedCard('B'))).toBe('Blessed')
    expect(setLabel(testCursedCard('C'))).toBeNull()
  })

  it('shows Common, Rare, or nothing', () => {
    expect(rarityLabel(testCard('A', { rarity: 'common' }))).toBe('Common')
    expect(rarityLabel(testCard('A', { rarity: 'rare' }))).toBe('Rare')
    expect(rarityLabel(testBlessedCard('B'))).toBeNull()
  })

  it('has a kind word only for Blessed and Cursed cards', () => {
    expect(kindLabel(testCard('A'))).toBeNull()
    expect(kindLabel(testBlessedCard('B'))).toBe('Blessed')
    expect(kindLabel(testCursedCard('C'))).toBe('Cursed')
  })
})

describe('cardMatchesQuery', () => {
  const matches = (card: Parameters<typeof cardHaystack>[0], query: string) =>
    cardMatchesQuery(cardHaystack(card), query)

  const discardDraw = testCard('Greedy Hands', { text: 'Discard a card, then draw two.' })
  const discardOnly = testCard('Let Go', { text: 'Discard your hand.' })

  it('needs every term to match', () => {
    expect(matches(discardDraw, 'discard, draw')).toBe(true)
    expect(matches(discardOnly, 'discard, draw')).toBe(false)
    expect(matches(discardOnly, 'discard;hand')).toBe(true)
  })

  it('matches everything for an empty query', () => {
    expect(matches(discardOnly, '')).toBe(true)
    expect(matches(discardOnly, ' , ;')).toBe(true)
  })

  it('ignores case, accents and punctuation', () => {
    expect(matches(testCard("Brünn's Batallion"), 'brunn')).toBe(true)
    expect(matches(testCard("Brünn's Batallion"), 'BRÜNNS BAT')).toBe(true)
  })

  it('finds a card by its official set name and by its set code', () => {
    const card = testCard('Night Owl', { setCode: 'Kesqer' })
    expect(matches(card, 'Kesqerian')).toBe(true)
    expect(matches(card, 'kesqer')).toBe(true)
  })

  it('searches the hidden bracket text', () => {
    const card = testCard("Hrolf's Hornswaggle", {
      text: '[Uno] Add +10 a d20 roll. If this is your only card, add +20.',
    })
    expect(matches(card, 'uno')).toBe(true)
  })

  it('searches the cost, rarity and mechanic pack', () => {
    const card = testCard('Dice', { cost: 'd6', rarity: 'rare', mechanicPack: "Gambler's Gambit" })
    expect(matches(card, 'd6')).toBe(true)
    expect(matches(card, 'rare')).toBe(true)
    expect(matches(card, 'gamblers gambit')).toBe(true)
  })

  it('finds Blessed and Cursed cards by their kind, but not normal cards by "normal"', () => {
    expect(matches(testBlessedCard('Halo'), 'blessed')).toBe(true)
    expect(matches(testCursedCard('Hex'), 'cursed')).toBe(true)
    expect(matches(testCard('Plain', { text: 'Nothing special.' }), 'normal')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import { zoomLine } from './display'

describe('zoomLine', () => {
  const aboleth = testCard("Aboleth's Eyes", { setCode: 'Kesqer', cost: '1', rarity: 'common' })

  it('names the set, the cost and the rarity of a Legend card', () => {
    expect(zoomLine(aboleth)).toBe('Kesqerian Nights · Cost 1 · Common')
  })

  it('says only "Blessed" for a Blessed card, which has no cost and no rarity', () => {
    expect(zoomLine(testBlessedCard('Second Wind'))).toBe('Blessed')
  })

  it('names a Cursed card as Cursed, with its cost', () => {
    expect(zoomLine(testCursedCard('Abandon All Hope', { cost: '1' }))).toBe('Cursed · Cost 1')
  })

  it('leaves out a missing cost', () => {
    expect(zoomLine(testCard('Owl', { cost: null, rarity: 'rare' }))).toBe(
      'Kesqerian Nights · Rare',
    )
  })

  it("shows a hand cost that differs, followed by the card's own cost", () => {
    const card = testCard('Owl', { cost: '3', rarity: 'common' })

    expect(zoomLine(card, '1')).toBe('Kesqerian Nights · Cost 1 (temel: 3) · Common')
  })

  it("gives the plain line when the hand cost is the card's own cost", () => {
    expect(zoomLine(aboleth, '1')).toBe('Kesqerian Nights · Cost 1 · Common')
  })

  it('shows "—" as the own cost of a card without one', () => {
    expect(zoomLine(testBlessedCard('Second Wind'), '2')).toBe('Blessed · Cost 2 (temel: —)')
  })
})

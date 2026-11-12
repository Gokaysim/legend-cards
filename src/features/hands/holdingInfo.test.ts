import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import { holdingInfo } from './holdingInfo'

describe('holdingInfo', () => {
  it("gives a Legend card's set, rarity in its frame's color, cost and mechanic pack", () => {
    const card = testCard("Aa-Uskh's Resuscitation", {
      setCode: 'Kesqer',
      rarity: 'rare',
      cost: '1',
      mechanicPack: 'Risk & Reward',
    })

    expect(holdingInfo(card, '1')).toEqual([
      { label: 'Kesqerian Nights' },
      { label: 'Rare', tone: 'rare' },
      { label: 'Cost 1' },
      { label: 'Risk & Reward', isMuted: true },
    ])
  })

  it('gives a Cursed card only "Cursed" and its cost', () => {
    expect(holdingInfo(testCursedCard('Abandon All Hope', { cost: '1' }), '1')).toEqual([
      { label: 'Cursed', tone: 'cursed' },
      { label: 'Cost 1' },
    ])
  })

  it('gives a Blessed card "Blessed", its cost and its mechanic pack', () => {
    const wind = testBlessedCard('Second Wind', { cost: '2', mechanicPack: 'Arcanus Divine' })

    expect(holdingInfo(wind, '2')).toEqual([
      { label: 'Blessed', tone: 'blessed' },
      { label: 'Cost 2' },
      { label: 'Arcanus Divine', isMuted: true },
    ])
  })

  it("names the card's own cost beside a hand cost that differs", () => {
    const card = testCard('Night Owl', { cost: '3', mechanicPack: null })

    expect(holdingInfo(card, '1')).toContainEqual({ label: 'Cost 1 (temel: 3)' })
    expect(holdingInfo({ ...card, cost: null }, '2')).toContainEqual({
      label: 'Cost 2 (temel: —)',
    })
  })

  it('leaves out a cost the card does not have', () => {
    const wind = testBlessedCard('Second Wind', { cost: null, mechanicPack: null })

    expect(holdingInfo(wind, null)).toEqual([{ label: 'Blessed', tone: 'blessed' }])
  })
})

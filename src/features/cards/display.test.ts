import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCursedCard } from '@/test/cardFixtures'
import { testTrueWord } from '@/test/trueWordFixtures'
import { USE_PRICE_CASES } from '@/test/usePriceCases'

import {
  AS_WRITTEN,
  cardFrame,
  cardHaystack,
  cardMatchesQuery,
  faceGlow,
  hasSetDetails,
  priceAllows,
  priceOfUse,
  rarityLabel,
  setLabel,
} from './display'

describe('priceOfUse', () => {
  it.each(USE_PRICE_CASES)('reads $cost as its price', ({ cost, price }) => {
    expect(priceOfUse(cost)).toEqual(price)
  })

  it.each(USE_PRICE_CASES)('allows and denies amounts for $cost', ({ cost, allowed, denied }) => {
    for (const amount of allowed) expect(priceAllows(priceOfUse(cost), amount)).toBe(true)
    for (const amount of denied) expect(priceAllows(priceOfUse(cost), amount)).toBe(false)
  })

  it('denies a fraction and more than one use may take', () => {
    expect(priceAllows({ kind: 'chosen' }, 1.5)).toBe(false)
    expect(priceAllows({ kind: 'chosen' }, 1_000_001)).toBe(false)
  })
})

describe('faceGlow', () => {
  const none = { isActive: false, isSelected: false, isRevealed: false, isHeld: false }

  it('makes a selected hand card glow gold', () => {
    expect(faceGlow('common', { ...none, isSelected: true })).toBe('selected')
    expect(faceGlow('rare', { ...none, isSelected: true })).toBe('selected')
  })

  it.each([
    ['common', 'active'],
    ['cursed', 'active-cursed'],
    ['blessed', 'active-blessed'],
  ] as const)('keeps the active glow of a selected active %s card', (frame, glow) => {
    expect(faceGlow(frame, { ...none, isActive: true, isSelected: true })).toBe(glow)
  })

  it('gives an unselected inactive hand card no glow', () => {
    expect(faceGlow('common', none)).toBeNull()
  })
})

describe('a True Word on a face', () => {
  const word = testTrueWord('Abyss', { cost: 'X', text: '[Deep] Pull them under.' })

  it('gets the True Words frame, no set details, and never a reveal glow', () => {
    expect(cardFrame(word)).toBe('word')
    expect(hasSetDetails(word)).toBe(false)
    expect(hasSetDetails(testCursedCard('Visions of Death'))).toBe(false)
    expect(hasSetDetails(testBlessedCard('Second Wind'))).toBe(true)
    expect(faceGlow('word', { isActive: false, isRevealed: true, isHeld: false })).toBeNull()
  })

  it('shows no set or rarity, and is searched by its name, cost and text', () => {
    expect(setLabel(word, AS_WRITTEN)).toBeNull()
    expect(rarityLabel(word)).toBeNull()
    const haystack = cardHaystack(word, AS_WRITTEN)
    for (const query of ['abyss', 'deep', 'pull them', 'x']) {
      expect(cardMatchesQuery(haystack, query)).toBe(true)
    }
    expect(cardMatchesQuery(haystack, 'cursed')).toBe(false)
  })
})

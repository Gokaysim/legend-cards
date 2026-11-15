import { describe, expect, it } from 'vitest'

import {
  BEHAVIOR_FLAGS,
  flagLabel,
  isHeldText,
  isOnlyFromDm,
  shownFlags,
  startingFlags,
  withFixedFlags,
} from './flags'

describe('startingFlags', () => {
  it('starts a normal card with one copy, in every channel, leaving the hand when used', () => {
    expect(startingFlags('normal', 'Gain 1 LP.')).toEqual({
      isInLibrary: true,
      isInDraws: true,
      isInSetPacks: true,
      isInMechanicPacks: true,
      isRepeatable: false,
      hasHeldEffect: false,
      hasUseEffect: true,
      isKeptOnUse: false,
    })
  })

  it('starts a Blessed card repeatable', () => {
    expect(startingFlags('blessed', '').isRepeatable).toBe(true)
  })

  it('starts a Cursed card repeatable and out of the packs', () => {
    expect(startingFlags('cursed', '')).toMatchObject({
      isRepeatable: true,
      isInSetPacks: false,
      isInMechanicPacks: false,
      isInDraws: true,
    })
  })

  it('starts a True Word repeatable, kept on use and out of the packs', () => {
    expect(startingFlags('trueWord', '')).toMatchObject({
      isRepeatable: true,
      isKeptOnUse: true,
      isInSetPacks: false,
      isInMechanicPacks: false,
      isInDraws: true,
      isInLibrary: true,
    })
  })

  it('makes a held text "Elde etkili"', () => {
    expect(startingFlags('cursed', 'Held: Every hour draw a cursed card.').hasHeldEffect).toBe(true)
  })
})

describe('isHeldText', () => {
  it.each([
    ['Held: +1 AC.', true],
    ['  held : +1 AC.', true],
    ['HELD: +1 AC.', true],
    ['[Uno] Held: +1 AC.', true],
    ['[Uno] [Solo] Held: +1 AC.', true],
    ['When held, gain 1 LP.', false],
    ['Gain 1 LP. Held: no.', false],
    ['', false],
  ])('%j is %s', (text, expected) => {
    expect(isHeldText(text)).toBe(expected)
  })
})

describe('shownFlags', () => {
  it('shows all eight for normal and Blessed cards', () => {
    expect(shownFlags('normal')).toEqual([...BEHAVIOR_FLAGS])
    expect(shownFlags('blessed')).toEqual([...BEHAVIOR_FLAGS])
  })

  it('leaves the pack flags out for a Cursed card', () => {
    expect(shownFlags('cursed')).toEqual([
      'isInLibrary',
      'isInDraws',
      'isRepeatable',
      'hasHeldEffect',
      'hasUseEffect',
      'isKeptOnUse',
    ])
  })

  it('shows four flags for a True Word', () => {
    expect(shownFlags('trueWord')).toEqual([
      'isInLibrary',
      'isInDraws',
      'hasHeldEffect',
      'hasUseEffect',
    ])
  })
})

describe('flagLabel', () => {
  it('names the draw flag after the kind', () => {
    expect(flagLabel('isInDraws', 'normal')).toBe('Kart çekmede çıkar')
    expect(flagLabel('isInDraws', 'blessed')).toBe('Kart çekmede çıkar')
    expect(flagLabel('isInDraws', 'cursed')).toBe("Cursed Deck'te çıkar")
    expect(flagLabel('isInDraws', 'trueWord')).toBe("Draft'ta çıkar")
  })

  it('names the other flags the same for every kind', () => {
    expect(flagLabel('isInLibrary', 'cursed')).toBe('Listede görünür')
    expect(flagLabel('isKeptOnUse', 'normal')).toBe('Kullanınca elde kalır')
  })
})

describe('withFixedFlags', () => {
  it('puts back the values a kind fixes', () => {
    const flags = { ...startingFlags('trueWord', ''), isKeptOnUse: false, isInSetPacks: true }
    expect(withFixedFlags('trueWord', flags)).toEqual(startingFlags('trueWord', ''))
  })
})

describe('isOnlyFromDm', () => {
  it('is true only with every "where" flag off', () => {
    const off = {
      isInLibrary: false,
      isInDraws: false,
      isInSetPacks: false,
      isInMechanicPacks: false,
    }
    expect(isOnlyFromDm(off)).toBe(true)
    expect(isOnlyFromDm({ ...off, isInLibrary: true })).toBe(false)
  })
})

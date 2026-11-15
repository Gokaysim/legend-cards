import { describe, expect, it } from 'vitest'

import { cardHistoryPath, LIBRARY_TABS, libraryPath, libraryTabOf } from './screens'

describe('the Kütüphane tabs', () => {
  it('lists Kartlar, Cursed and True Words, in that order, each with its Cardmaker', () => {
    expect(LIBRARY_TABS.map((tab) => [tab.label, tab.mascot])).toEqual([
      ['♠ Kartlar', 'cardmaker_lib'],
      ['☠ Cursed', 'cardmaker_cursed'],
      ['✦ True Words', 'cardmaker_true'],
    ])
  })

  it.each([
    [null, 'cards'],
    ['cursed', 'cursed'],
    ['true-words', 'true-words'],
    ['', 'cards'],
    ['cards', 'cards'],
    ['notes', 'cards'],
  ] as const)('opens the tab of the value %j: %s', (value, tab) => {
    expect(libraryTabOf(value)).toBe(tab)
  })

  it('builds the address of each tab, with the DM chosen player on True Words', () => {
    expect(libraryPath()).toBe('/library')
    expect(libraryPath('cards')).toBe('/library')
    expect(libraryPath('cursed')).toBe('/library?tab=cursed')
    expect(libraryPath('true-words')).toBe('/library?tab=true-words')
    expect(libraryPath('true-words', 'bora uid')).toBe('/library?tab=true-words&for=bora+uid')
  })
})

describe('the Kart geçmişi address', () => {
  it('sits below the Kütüphane for every kind of card', () => {
    expect(cardHistoryPath({ id: 'legend-abolethseyes' })).toBe('/library/legend-abolethseyes')
    expect(cardHistoryPath({ id: 'cursed-visionsofdeath' })).toBe('/library/cursed-visionsofdeath')
  })
})

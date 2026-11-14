import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testSetIndex } from '@/test/setFixtures'

import { setChoices } from './setChoices'

describe('setChoices', () => {
  const cards = [
    testCard('Desert Wind', { setCode: 'Kesqer' }),
    testCard('Harbor Light', { setCode: 'Havenholm' }),
    testCard('Last Hour', { setCode: 'The End Is Nigh' }),
    testCard('Final Bell', { setCode: 'endisnigh' }),
    testCard('Odd One', { setCode: 'Zeta' }),
    testCard('Strange One', { setCode: 'Atlantis' }),
    testCard('Second Desert', { setCode: 'kesqer' }),
    testBlessedCard('Second Wind'),
    testCursedCard('Visions of Death'),
  ]

  it('lists stored sets in the shop order by their names, each once, then unknown codes alphabetically', () => {
    expect(setChoices(cards, testSetIndex, { withBlessed: false })).toEqual([
      { code: 'The End is Nigh', label: 'The End is Nigh' },
      { code: 'Kesqer', label: 'Kesqerian Nights' },
      { code: 'Havenholm', label: 'Throne of Havenholm' },
      { code: 'Atlantis', label: 'Atlantis' },
      { code: 'Zeta', label: 'Zeta' },
    ])
  })

  it('adds "Blessed" last only when asked and a Blessed card is there', () => {
    expect(setChoices(cards, testSetIndex, { withBlessed: true }).at(-1)).toEqual({
      code: 'Blessed',
      label: 'Blessed',
    })
    const withoutBlessed = cards.filter((card) => card.kind !== 'blessed')
    expect(
      setChoices(withoutBlessed, testSetIndex, { withBlessed: true }).map((choice) => choice.code),
    ).not.toContain('Blessed')
  })
})

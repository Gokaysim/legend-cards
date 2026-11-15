import { describe, expect, it } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testTrueWord } from '@/test/trueWordFixtures'

import { handEntries, showsActive } from './handEntries'

describe('showsActive', () => {
  it('shows a holding active only while it is switched on and its definition acts while held', () => {
    expect(showsActive({ active: true }, { hasHeldEffect: true })).toBe(true)
    expect(showsActive({ active: true }, { hasHeldEffect: false })).toBe(false)
    expect(showsActive({ active: false }, { hasHeldEffect: true })).toBe(false)
  })
})

describe('handEntries', () => {
  const pride = testCursedCard("Devil's Pride", { hasHeldEffect: true })
  const owl = testCard('Night Owl')

  it('gives each holding its card, the active state as it shows, and leaves out True Words', () => {
    const abyss = testTrueWord('Abyss')
    const holdings = [
      testHolding(pride, 'ayla', 1000, { active: true }),
      testHolding(owl, 'ayla', 2000, { active: true }),
      testHolding(abyss, 'ayla', 3000, { active: true }),
    ]
    const cards = new Map([
      [pride.id, pride],
      [owl.id, owl],
    ])
    expect(
      handEntries(holdings, cards, 'ayla').map(({ card, holding }) => [card.name, holding.active]),
    ).toEqual([
      ["Devil's Pride", true],
      ['Night Owl', false],
    ])
  })

  it('names an extra copy only for a card with one copy', () => {
    const shared = testCard('Shared', { isRepeatable: true })
    const held = { ...owl, holder: { uid: 'bora', userCardId: 'h-bora' } }
    const entries = handEntries(
      [testHolding(shared, 'ayla', 1000), testHolding(held, 'ayla', 2000)],
      new Map([
        [shared.id, shared],
        [held.id, held],
      ]),
      'ayla',
    )
    expect(entries.map((entry) => entry.isExtraCopy)).toEqual([false, true])
  })
})

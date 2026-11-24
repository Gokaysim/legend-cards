import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import type { Definition } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import { testCard, testCustomCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { TestHoldingsProvider } from '@/test/TestHoldingsProvider'
import { testTrueWord } from '@/test/trueWordFixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'
import type { Subscription } from '@/lib/firestore/subscription'

import { canOpenCardPage, useCardPageAccess } from './cardAccess'

const listed = testCard("Aboleth's Eyes")
const hidden = testCard('Hidden Card', { isInLibrary: false })
const draft = testCard('Draft Card', { status: 'draft' })
const retired = testCard('Retired Card', { status: 'retired' })
const custom = testCustomCard('custom-1')

describe('canOpenCardPage', () => {
  it.each([
    ['a listed active card', listed, false, true],
    ['a hidden card no one holds', hidden, false, false],
    ['a hidden card someone holds', hidden, true, true],
    ['a draft', draft, false, false],
    ['a retired card no one holds', retired, false, false],
    ['a retired card someone holds', retired, true, true],
    ['a Custom Card', custom, false, true],
  ])('opens %s for a player: %s', (_, card, isHeld, expected) => {
    expect(canOpenCardPage(card, false, isHeld)).toBe(expected)
  })

  it('opens every card for the DM', () => {
    for (const card of [listed, hidden, draft, retired, custom]) {
      expect(canOpenCardPage(card, true, false)).toBe(true)
    }
  })
})

describe('useCardPageAccess', () => {
  const word = testTrueWord('Abyss')

  const render = ({
    role = 'player',
    cards = ready<Definition[]>([listed, hidden, word]),
    holdings = ready<Holding[]>([]),
  }: {
    role?: 'dm' | 'player'
    cards?: Subscription<Definition[]>
    holdings?: Subscription<Holding[]>
  }) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestUsersProvider currentProfile={ready(testProfile({ role }))}>
        <TestCardsProvider cards={cards}>
          <TestHoldingsProvider openHoldings={holdings}>{children}</TestHoldingsProvider>
        </TestCardsProvider>
      </TestUsersProvider>
    )
    return renderHook(() => useCardPageAccess(), { wrapper }).result.current
  }

  it('answers false while the cards or the holdings load', () => {
    expect(render({ cards: { status: 'loading' } })(listed.id)).toBe(false)
    expect(render({ holdings: { status: 'loading' } })(listed.id)).toBe(false)
  })

  it('answers false for a True Word and an unknown ID, even for the DM', () => {
    const canOpen = render({ role: 'dm' })
    expect(canOpen(word.id)).toBe(false)
    expect(canOpen('nothing')).toBe(false)
  })

  it("opens a player's hidden card only while someone holds it", () => {
    expect(render({})(hidden.id)).toBe(false)
    expect(render({ holdings: ready([testHolding(hidden, 'bora', 0)]) })(hidden.id)).toBe(true)
    expect(render({})(listed.id)).toBe(true)
  })
})

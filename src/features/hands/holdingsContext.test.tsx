import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { TestHoldingsProvider } from '@/test/TestHoldingsProvider'
import { testTrueWord } from '@/test/trueWordFixtures'

import { holdersOf, holdingsOf, useOpenHoldings, useOpenWordHoldings } from './holdingsContext'

const owl = testCard('Night Owl')
const greedy = testCard('Greedy Hands')
const visions = testCursedCard('Visions of Death')

describe('holdingsOf', () => {
  it("lists one player's holdings in the order they were received", () => {
    const holdings = [
      testHolding(owl, 'ayla', 3000),
      testHolding(greedy, 'bora', 1000),
      testHolding(visions, 'ayla', 1000),
      testHolding(greedy, 'ayla', 2000, { id: 'copy' }),
    ]

    expect(holdingsOf(holdings, 'ayla').map((holding) => holding.cardName)).toEqual([
      'Visions of Death',
      'Greedy Hands',
      'Night Owl',
    ])
    expect(holdingsOf(holdings, 'carol')).toEqual([])
  })

  it('puts a holding whose server time is still pending last', () => {
    const holdings = [
      testHolding(owl, 'ayla', 0, { givenAt: null }),
      testHolding(visions, 'ayla', 5000),
      testHolding(greedy, 'ayla', 1000),
    ]

    expect(holdingsOf(holdings, 'ayla').map((holding) => holding.cardName)).toEqual([
      'Greedy Hands',
      'Visions of Death',
      'Night Owl',
    ])
  })

  it('orders holdings received at the same time by ID', () => {
    const holdings = [
      testHolding(owl, 'ayla', 1000, { id: 'b' }),
      testHolding(greedy, 'ayla', 1000, { id: 'a' }),
    ]

    expect(holdingsOf(holdings, 'ayla').map((holding) => holding.id)).toEqual(['a', 'b'])
  })
})

describe('holdersOf', () => {
  it('names everyone who holds a copy, once each, in the order they received their first copy', () => {
    const holdings = [
      testHolding(visions, 'bora', 2000),
      testHolding(visions, 'ayla', 1000),
      testHolding(visions, 'ayla', 3000, { id: 'second' }),
      testHolding(owl, 'carol', 500),
    ]

    expect(holdersOf(holdings, visions.id)).toEqual(['ayla', 'bora'])
    expect(holdersOf(holdings, owl.id)).toEqual(['carol'])
    expect(holdersOf(holdings, greedy.id)).toEqual([])
  })
})

describe('useOpenHoldings', () => {
  const card = testHolding(owl, 'ayla', 1000)
  const word = testHolding(testTrueWord('Abyss'), 'ayla', 2000, { id: 'h-abyss' })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestHoldingsProvider openHoldings={ready([card, word])}>{children}</TestHoldingsProvider>
  )

  it('reads the open holdings of cards from the provider, leaving out the True Words', () => {
    expect(renderHook(() => useOpenHoldings(), { wrapper }).result.current).toEqual(ready([card]))
  })

  it('reads the open holdings of True Words apart', () => {
    expect(renderHook(() => useOpenWordHoldings(), { wrapper }).result.current).toEqual(
      ready([word]),
    )
  })

  it('fails outside a provider', () => {
    expect(() => renderHook(() => useOpenHoldings())).toThrow('<HoldingsProvider>')
  })
})

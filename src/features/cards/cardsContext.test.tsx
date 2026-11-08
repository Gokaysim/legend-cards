import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { TestCardsProvider } from '@/test/TestCardsProvider'

import { useCards, useDeckCards } from './cardsContext'
import type { Card } from './schema'
import type { Subscription } from '@/lib/firestore/subscription'

const common = testCard('Aboleth Eyes')
const blessed = testBlessedCard('Dawn of Fortune')
const cursed = testCursedCard('Visions of Death')

function wrapperWith(cards: Subscription<Card[]>) {
  return ({ children }: { children: ReactNode }) => (
    <TestCardsProvider cards={cards}>{children}</TestCardsProvider>
  )
}

describe('useDeckCards', () => {
  it('gives the Legend deck the normal and Blessed cards', () => {
    const { result } = renderHook(() => useDeckCards('legend'), {
      wrapper: wrapperWith(ready([common, cursed, blessed])),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [common, blessed] })
  })

  it('gives the Cursed deck only the Cursed cards', () => {
    const { result } = renderHook(() => useDeckCards('cursed'), {
      wrapper: wrapperWith(ready([common, cursed, blessed])),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [cursed] })
  })

  it('passes loading and error states through', () => {
    const loading = renderHook(() => useDeckCards('legend'), {
      wrapper: wrapperWith({ status: 'loading' }),
    })
    expect(loading.result.current).toEqual({ status: 'loading' })

    const error: Subscription<Card[]> = {
      status: 'error',
      error: { kind: 'permission-denied', message: 'denied', path: 'cards' },
    }
    const failed = renderHook(() => useDeckCards('cursed'), { wrapper: wrapperWith(error) })
    expect(failed.result.current).toBe(error)
  })
})

describe('useCards', () => {
  it('fails outside a provider', () => {
    expect(() => renderHook(() => useCards())).toThrow('<CardsProvider>')
  })
})

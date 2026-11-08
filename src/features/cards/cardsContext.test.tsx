import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { TestCardsProvider } from '@/test/TestCardsProvider'

import { useCards, useCardsById, useDeckCards } from './cardsContext'
import type { Card } from './schema'
import type { Subscription } from '@/lib/firestore/subscription'

const common = testCard('Aboleth Eyes')
const blessed = testBlessedCard('Dawn of Fortune')
const cursed = testCursedCard('Visions of Death')
const retired = testCard('Old Card', { retired: true })
const retiredCursed = testCursedCard('Old Curse', { retired: true })

function wrapperWith(cards: Subscription<Card[]>) {
  return ({ children }: { children: ReactNode }) => (
    <TestCardsProvider cards={cards}>{children}</TestCardsProvider>
  )
}

describe('useCards', () => {
  it('lists the active cards only', () => {
    const { result } = renderHook(() => useCards(), {
      wrapper: wrapperWith(ready([common, retired, cursed, retiredCursed, blessed])),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [common, cursed, blessed] })
  })

  it('fails outside a provider', () => {
    expect(() => renderHook(() => useCards())).toThrow('<CardsProvider>')
  })
})

describe('useCardsById', () => {
  it('maps every card by its ID, retired ones included', () => {
    const { result } = renderHook(() => useCardsById(), {
      wrapper: wrapperWith(ready([common, retired, cursed, retiredCursed])),
    })
    expect(result.current.status).toBe('ready')
    const byId = result.current.status === 'ready' ? result.current.data : new Map()
    expect([...byId.keys()]).toEqual([common.id, retired.id, cursed.id, retiredCursed.id])
    expect(byId.get(retired.id)).toBe(retired)
  })

  it('passes loading and error states through', () => {
    const loading = renderHook(() => useCardsById(), {
      wrapper: wrapperWith({ status: 'loading' }),
    })
    expect(loading.result.current).toEqual({ status: 'loading' })

    const error: Subscription<Card[]> = {
      status: 'error',
      error: { kind: 'permission-denied', message: 'denied', path: 'cards' },
    }
    const failed = renderHook(() => useCardsById(), { wrapper: wrapperWith(error) })
    expect(failed.result.current).toEqual(error)
  })
})

describe('useDeckCards', () => {
  it('gives the Legend deck the active normal and Blessed cards', () => {
    const { result } = renderHook(() => useDeckCards('legend'), {
      wrapper: wrapperWith(ready([common, retired, cursed, blessed])),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [common, blessed] })
  })

  it('gives the Cursed deck only the active Cursed cards', () => {
    const { result } = renderHook(() => useDeckCards('cursed'), {
      wrapper: wrapperWith(ready([common, cursed, retiredCursed, blessed])),
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
    expect(failed.result.current).toEqual(error)
  })
})

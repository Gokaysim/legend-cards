import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { testTrueWord } from '@/test/trueWordFixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import {
  useCards,
  useCardsById,
  useDeckCards,
  useDeckDefinitions,
  useWords,
  useWordsById,
} from './cardsContext'
import type { Card } from './schema'
import type { Subscription } from '@/lib/firestore/subscription'

const common = testCard('Aboleth Eyes')
const blessed = testBlessedCard('Dawn of Fortune')
const cursed = testCursedCard('Visions of Death')
const retired = testCard('Old Card', { status: 'retired' })
const retiredCursed = testCursedCard('Old Curse', { status: 'retired' })
const draft = testCard('New Card', { status: 'draft' })

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

describe('cards not listed for players', () => {
  const wish = testCard('The Last Wish', { isInLibrary: false })
  const crown = testCursedCard('Crown of Ash', { isInLibrary: false, status: 'retired' })

  function withRole(role: 'dm' | 'player') {
    const profile = testProfile({ role })
    return ({ children }: { children: ReactNode }) => (
      <TestUsersProvider currentProfile={ready(profile)} profiles={ready([profile])}>
        <TestCardsProvider cards={ready([common, wish, crown])}>{children}</TestCardsProvider>
      </TestUsersProvider>
    )
  }
  const useLists = () => ({
    cards: useCards(),
    legend: useDeckDefinitions('legend'),
    cursed: useDeckDefinitions('cursed'),
    byId: useCardsById(),
  })
  const ids = (subscription: Subscription<Card[]>) =>
    subscription.status === 'ready' ? subscription.data.map((card) => card.id) : []

  it("leaves them out of a player's lists, and keeps them in the map for the hands", () => {
    const { result } = renderHook(useLists, { wrapper: withRole('player') })
    expect(ids(result.current.cards)).toEqual([common.id])
    expect(ids(result.current.legend)).toEqual([common.id])
    expect(ids(result.current.cursed)).toEqual([])
    const byId = result.current.byId.status === 'ready' ? result.current.byId.data : new Map()
    expect(byId.get(wish.id)).toBe(wish)
    expect(byId.get(crown.id)).toBe(crown)
  })

  it("keeps them in the DM's lists", () => {
    const { result } = renderHook(useLists, { wrapper: withRole('dm') })
    expect(ids(result.current.cards)).toEqual([common.id, wish.id])
    expect(ids(result.current.legend)).toEqual([common.id, wish.id])
    expect(ids(result.current.cursed)).toEqual([crown.id])
  })
})

describe('True Words in the same collection', () => {
  const abyss = testTrueWord('Abyss')
  const hidden = testTrueWord('Justice', { isInLibrary: false })

  it('splits them from the cards, and keeps hidden ones for drafts and hands', () => {
    const profile = testProfile({ role: 'player' })
    const { result } = renderHook(
      () => ({
        cards: useCards(),
        byId: useCardsById(),
        words: useWords(),
        wordsById: useWordsById(),
      }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <TestUsersProvider currentProfile={ready(profile)} profiles={ready([profile])}>
            <TestCardsProvider cards={ready([common, abyss, hidden])}>{children}</TestCardsProvider>
          </TestUsersProvider>
        ),
      },
    )
    const cards = result.current.cards.status === 'ready' ? result.current.cards.data : []
    expect(cards.map((card) => card.id)).toEqual([common.id])
    const byId = result.current.byId.status === 'ready' ? result.current.byId.data : new Map()
    expect(byId.has(abyss.id)).toBe(false)
    const words = result.current.words.status === 'ready' ? result.current.words.data : []
    expect(words.map((word) => word.id)).toEqual([abyss.id, hidden.id])
    const wordsById =
      result.current.wordsById.status === 'ready' ? result.current.wordsById.data : new Map()
    expect(wordsById.get(hidden.id)).toBe(hidden)
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

describe('useDeckDefinitions', () => {
  it("gives one deck's cards whatever their status, for the DM's status filter", () => {
    const { result } = renderHook(() => useDeckDefinitions('legend'), {
      wrapper: wrapperWith(ready([common, retired, draft, cursed, blessed])),
    })
    expect(result.current).toMatchObject({
      status: 'ready',
      data: [common, retired, draft, blessed],
    })
  })

  it('keeps drafts out of the active cards', () => {
    const { result } = renderHook(() => useCards(), {
      wrapper: wrapperWith(ready([common, draft])),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [common] })
  })
})

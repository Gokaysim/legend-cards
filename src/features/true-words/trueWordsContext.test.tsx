import { renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { ready } from '@/test/fixtures'
import { type TestTrueWords, TestTrueWordsProvider } from '@/test/TestTrueWordsProvider'
import { testLearnedWord, testTrueWord, testWordDraft } from '@/test/trueWordFixtures'

import {
  knownWordEntries,
  knownWordsOf,
  useKnownWords,
  useOpenDraft,
  useTrueWords,
} from './trueWordsContext'

const abyss = testTrueWord('Abyss')
const aid = testTrueWord('Aid')
const chaos = testTrueWord('Chaos')
const old = testTrueWord('Old', { status: 'retired' })

const at = (millis: number) => ({ learnedAt: Timestamp.fromMillis(millis) })

describe('knownWordsOf', () => {
  it("lists one player's known words in the order learned", () => {
    const records = [
      testLearnedWord('r1', abyss, 'ayla', at(3000)),
      testLearnedWord('r2', aid, 'bora', at(1000)),
      testLearnedWord('r3', chaos, 'ayla', at(1000)),
    ]
    expect(knownWordsOf(records, 'ayla').map((record) => record.wordName)).toEqual([
      'Chaos',
      'Abyss',
    ])
  })

  it('puts a record whose server time is still pending last', () => {
    const records = [
      testLearnedWord('r1', abyss, 'ayla', { learnedAt: null }),
      testLearnedWord('r2', aid, 'ayla', at(5000)),
    ]
    expect(knownWordsOf(records, 'ayla').map((record) => record.id)).toEqual(['r2', 'r1'])
  })

  it('leaves out a word being taken back', () => {
    const records = [
      testLearnedWord('r1', abyss, 'ayla', { removedBy: 'dana' }),
      testLearnedWord('r2', aid, 'ayla'),
    ]
    expect(knownWordsOf(records, 'ayla').map((record) => record.id)).toEqual(['r2'])
  })
})

describe('knownWordEntries', () => {
  it('gives each record its word, active only while the word acts while held', () => {
    const justice = testTrueWord('Justice', { hasHeldEffect: true })
    const entries = knownWordEntries(
      [
        testLearnedWord('r1', justice, 'ayla', { active: true }),
        testLearnedWord('r2', abyss, 'ayla', { active: true }),
      ],
      new Map([
        [justice.id, justice],
        [abyss.id, abyss],
      ]),
    )
    expect(entries.map(({ word, record }) => [word.name, record.active])).toEqual([
      ['Justice', true],
      ['Abyss', false],
    ])
  })
})

describe('the True Words hooks', () => {
  const wrapper =
    (data: TestTrueWords) =>
    ({ children }: { children: ReactNode }) => (
      <TestTrueWordsProvider {...data}>{children}</TestTrueWordsProvider>
    )

  it('give every word, retired ones included', () => {
    const { result } = renderHook(() => useTrueWords(), {
      wrapper: wrapper({ words: ready([abyss, old]) }),
    })
    expect(result.current).toMatchObject({ status: 'ready', data: [abyss, old] })
  })

  it("give one player's known words and open draft", () => {
    const draft = testWordDraft('d1', 'bora', [abyss, aid, chaos])
    const data: TestTrueWords = {
      knownWords: ready([testLearnedWord('r1', abyss, 'ayla'), testLearnedWord('r2', aid, 'bora')]),
      openDrafts: ready([draft]),
    }
    const known = renderHook(() => useKnownWords('ayla'), { wrapper: wrapper(data) })
    expect(known.result.current).toMatchObject({ status: 'ready', data: [{ id: 'r1' }] })

    const ayla = renderHook(() => useOpenDraft('ayla'), { wrapper: wrapper(data) })
    expect(ayla.result.current).toMatchObject({ status: 'ready', data: null })
    const bora = renderHook(() => useOpenDraft('bora'), { wrapper: wrapper(data) })
    expect(bora.result.current).toMatchObject({ status: 'ready', data: draft })
  })

  it('keep a loading state as it is', () => {
    const { result } = renderHook(() => useKnownWords('ayla'), {
      wrapper: wrapper({ knownWords: { status: 'loading' } }),
    })
    expect(result.current).toEqual({ status: 'loading' })
  })
})

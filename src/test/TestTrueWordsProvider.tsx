import { type ReactNode, useMemo } from 'react'

import type { LearnedWord, TrueWord, WordDraft } from '@/features/true-words/schema'
import {
  type TrueWordActions,
  TrueWordsContext,
  type TrueWordsContextValue,
} from '@/features/true-words/trueWordsContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestTrueWords = {
  /** Every word. Defaults to a ready, empty list. */
  words?: Subscription<TrueWord[]>
  /** Every record of a word someone knows now. Defaults to a ready, empty list. */
  knownWords?: Subscription<LearnedWord[]>
  /** Every open draft. Defaults to a ready, empty list. */
  openDrafts?: Subscription<WordDraft[]>
  /** Fakes for the steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<TrueWordActions>
}

export type TestTrueWordsProviderProps = TestTrueWords & { children: ReactNode }

const SUCCEEDING_ACTIONS: TrueWordActions = {
  startDraft: () => Promise.resolve('test-draft'),
  learnWord: () => Promise.resolve('test-record'),
  skipDraft: () => Promise.resolve(),
  cancelDraft: () => Promise.resolve(),
  teachWord: () => Promise.resolve('test-record'),
  takeBackWord: () => Promise.resolve(),
  setActive: () => Promise.resolve(),
  setNote: () => Promise.resolve(),
  setCost: () => Promise.resolve(),
  recordWordUse: () => Promise.resolve(),
}

/** Provides fixed words, known words and open drafts, and fake steps, to components under test, without Firebase. */
export function TestTrueWordsProvider({
  words,
  knownWords,
  openDrafts,
  actions,
  children,
}: TestTrueWordsProviderProps) {
  const value = useMemo<TrueWordsContextValue>(
    () => ({
      words: words ?? ready([]),
      knownWords: knownWords ?? ready([]),
      openDrafts: openDrafts ?? ready([]),
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [words, knownWords, openDrafts, actions],
  )
  return <TrueWordsContext value={value}>{children}</TrueWordsContext>
}

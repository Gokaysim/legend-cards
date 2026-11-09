import { createContext, useContext, useMemo } from 'react'

import { compareLabels } from '@/features/cards/sort'
import type { Subscription } from '@/lib/firestore/subscription'

import type {
  DraftStepInput,
  LearnWordInput,
  StartDraftInput,
  TakeBackWordInput,
  TeachWordInput,
} from './api'
import { isKnown, type LearnedWord, type TrueWord, type WordDraft } from './schema'

/**
 * The True Word steps of `api.ts`, bound to the app's Firestore. Components call them through
 * `useTrueWordActions()`, so unit tests can provide fakes and never load Firebase.
 */
export type TrueWordActions = {
  startDraft: (input: Omit<StartDraftInput, 'random'>) => Promise<string>
  learnWord: (input: LearnWordInput) => Promise<string>
  skipDraft: (input: DraftStepInput) => Promise<void>
  cancelDraft: (input: DraftStepInput) => Promise<void>
  teachWord: (input: TeachWordInput) => Promise<string>
  takeBackWord: (input: TakeBackWordInput) => Promise<void>
  setActive: (recordId: string, active: boolean) => Promise<void>
}

export type TrueWordsContextValue = {
  /** Every word, retired ones included. Empty when signed out. */
  words: Subscription<TrueWord[]>
  /** Every record of a word someone knows now. */
  knownWords: Subscription<LearnedWord[]>
  /** Every open draft: at most one per player. */
  openDrafts: Subscription<WordDraft[]>
  actions: TrueWordActions
}

export const TrueWordsContext = createContext<TrueWordsContextValue | null>(null)

function useTrueWordsContext(): TrueWordsContextValue {
  const value = useContext(TrueWordsContext)
  if (!value) throw new Error('True Words hooks must be used inside <TrueWordsProvider>')
  return value
}

/** Maps a ready subscription's data, keeping loading and error states as they are. */
function mapReady<T, U>(subscription: Subscription<T>, map: (data: T) => U): Subscription<U> {
  return subscription.status === 'ready'
    ? { ...subscription, data: map(subscription.data) }
    : subscription
}

/** Every word, retired ones included. Must be used inside `<TrueWordsProvider>`. */
export function useTrueWords(): Subscription<TrueWord[]> {
  return useTrueWordsContext().words
}

/**
 * Learn order: the order the words were learned (`learnedAt`). A record whose server time is still pending comes
 * last. Ties go by ID, so the order is stable.
 */
export function compareLearnOrder(a: LearnedWord, b: LearnedWord): number {
  if (a.learnedAt === null || b.learnedAt === null) {
    if (a.learnedAt !== b.learnedAt) return a.learnedAt === null ? 1 : -1
  } else {
    const byTime = a.learnedAt.toMillis() - b.learnedAt.toMillis()
    if (byTime !== 0) return byTime
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** One player's known words, in the order learned. A record being taken back right now is left out. */
export function knownWordsOf(records: readonly LearnedWord[], uid: string): LearnedWord[] {
  return records.filter((record) => record.uid === uid && isKnown(record)).sort(compareLearnOrder)
}

/** The active words, sorted by name for the True Words screen and the teach dialog. */
export function activeWordsSorted(words: readonly TrueWord[]): TrueWord[] {
  return words.filter((word) => !word.retired).sort((a, b) => compareLabels(a.name, b.name))
}

/** One player's known words, in the order learned. Must be used inside `<TrueWordsProvider>`. */
export function useKnownWords(uid: string): Subscription<LearnedWord[]> {
  const records = useTrueWordsContext().knownWords
  return useMemo(() => mapReady(records, (data) => knownWordsOf(data, uid)), [records, uid])
}

/** One player's open draft, or `null`. Must be used inside `<TrueWordsProvider>`. */
export function useOpenDraft(uid: string): Subscription<WordDraft | null> {
  const drafts = useTrueWordsContext().openDrafts
  return useMemo(
    () => mapReady(drafts, (data) => data.find((draft) => draft.uid === uid) ?? null),
    [drafts, uid],
  )
}

/** The True Word steps. Must be used inside `<TrueWordsProvider>`. */
export function useTrueWordActions(): TrueWordActions {
  return useTrueWordsContext().actions
}

/** A known word with its definition, for a hand's True Words. */
export type KnownWordEntry = { record: LearnedWord; word: TrueWord }

/**
 * Pairs each known word's record with its definition. A word missing from the list (it should not be) is drawn
 * from the record's name, with an unknown cost.
 */
export function knownWordEntries(
  records: readonly LearnedWord[],
  wordsById: ReadonlyMap<string, TrueWord>,
): KnownWordEntry[] {
  return records.map((record) => ({
    record,
    word: wordsById.get(record.wordId) ?? {
      id: record.wordId,
      name: record.wordName,
      nameKey: record.wordId,
      cost: '?',
      text: '',
      retired: true,
    },
  }))
}

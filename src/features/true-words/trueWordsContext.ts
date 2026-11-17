import { createContext, useContext, useMemo } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type {
  DraftStepInput,
  LearnWordInput,
  RecordWordUseInput,
  StartDraftInput,
  TakeBackWordInput,
  TeachWordInput,
} from './api'
import { showsActive } from '@/features/hands/handEntries'

import { missingWord } from './display'
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
  /** Saves the note on a known word: the player or the DM (spec: true-words, "Notes and costs on known words"). */
  setNote: (recordId: string, note: string) => Promise<void>
  /** Sets the word's cost in this hand (the DM); a blank value restores the word's own cost. */
  setCost: (recordId: string, cost: string) => Promise<void>
  /** Records a use of a known word with its payment. */
  recordWordUse: (input: RecordWordUseInput) => Promise<void>
}

export type TrueWordsContextValue = {
  /**
   * Every word this device reads: for the DM all of them, drafts included; for a player the active and retired ones,
   * hidden ones included. Empty when signed out.
   */
  words: Subscription<TrueWord[]>
  /** Every word someone knows now: the open True Word holdings, as known words. */
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

/** Every word this device reads, retired ones included. Must be used inside `<TrueWordsProvider>`. */
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

/** Every record of a word someone knows now, all players'. Must be used inside `<TrueWordsProvider>`. */
export function useTrueWordRecords(): Subscription<LearnedWord[]> {
  return useTrueWordsContext().knownWords
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
 * from the record's name, with an unknown cost. A word shows as active only while its "Elde etkili" is on (design D6 of
 * unify-cards-and-true-words).
 */
export function knownWordEntries(
  records: readonly LearnedWord[],
  wordsById: ReadonlyMap<string, TrueWord>,
): KnownWordEntry[] {
  return records.map((record) => {
    const word = wordsById.get(record.wordId) ?? missingWord(record.wordId, record.wordName)
    return { record: { ...record, active: showsActive(record, word) }, word }
  })
}

import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useWords } from '@/features/cards/cardsContext'
import { setHoldingCost, setHoldingNote } from '@/features/hands/api'
import { useOpenWordHoldings } from '@/features/hands/holdingsContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import {
  cancelDraft,
  learnWord,
  openDraftsQuery,
  recordWordUse,
  setWordActive,
  skipDraft,
  startDraft,
  takeBackWord,
  teachWord,
} from './api'
import { learnedWordOf } from './schema'
import {
  type TrueWordActions,
  TrueWordsContext,
  type TrueWordsContextValue,
} from './trueWordsContext'

const openDrafts = openDraftsQuery(db)

const actions: TrueWordActions = {
  startDraft: (input) => startDraft(db, input),
  learnWord: (input) => learnWord(db, input),
  skipDraft: (input) => skipDraft(db, input),
  cancelDraft: (input) => cancelDraft(db, input),
  teachWord: (input) => teachWord(db, input),
  takeBackWord: (input) => takeBackWord(db, input),
  setActive: (recordId, active) => setWordActive(db, recordId, active),
  setNote: (recordId, note) => setHoldingNote(db, recordId, note),
  setCost: (recordId, cost) => setHoldingCost(db, recordId, cost),
  recordWordUse: (input) => recordWordUse(db, input),
}

/**
 * Shares the True Words in real time (design D1, D5 of unify-cards-and-true-words): the words come from the one cards
 * subscription (`useWords`), the known words from the open holdings of the kind `trueWord`, and the open drafts from a
 * query on `draws`, plus the True Word steps bound to the app's Firestore. Mounted under `CardsProvider` and
 * `HoldingsProvider`. Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function TrueWordsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const words = useWords()
  const holdings = useOpenWordHoldings()
  const drafts = useCollection(auth.status === 'signedIn' ? openDrafts : null)
  const knownWords = useMemo(
    () =>
      holdings.status === 'ready'
        ? {
            ...holdings,
            data: holdings.data.map(learnedWordOf),
          }
        : holdings,
    [holdings],
  )
  const value = useMemo<TrueWordsContextValue>(
    () => ({ words, knownWords, openDrafts: drafts, actions }),
    [words, knownWords, drafts],
  )
  return <TrueWordsContext value={value}>{children}</TrueWordsContext>
}

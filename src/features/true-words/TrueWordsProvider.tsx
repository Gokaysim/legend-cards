import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import {
  cancelDraft,
  knownWordsQuery,
  learnWord,
  openDraftsQuery,
  setWordActive,
  skipDraft,
  startDraft,
  takeBackWord,
  teachWord,
  trueWordsRef,
} from './api'
import {
  type TrueWordActions,
  TrueWordsContext,
  type TrueWordsContextValue,
} from './trueWordsContext'

const words = trueWordsRef(db)
const knownWords = knownWordsQuery(db)
const openDrafts = openDraftsQuery(db)

const actions: TrueWordActions = {
  startDraft: (input) => startDraft(db, input),
  learnWord: (input) => learnWord(db, input),
  skipDraft: (input) => skipDraft(db, input),
  cancelDraft: (input) => cancelDraft(db, input),
  teachWord: (input) => teachWord(db, input),
  takeBackWord: (input) => takeBackWord(db, input),
  setActive: (recordId, active) => setWordActive(db, recordId, active),
}

/**
 * Shares the True Words in real time, with one subscription each for the whole app: every word, every word someone
 * knows now, and every open draft, plus the True Word steps bound to the app's Firestore. Each is small at this
 * table's scale. Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function TrueWordsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const signedIn = auth.status === 'signedIn'
  const wordList = useCollection(signedIn ? words : null)
  const known = useCollection(signedIn ? knownWords : null)
  const drafts = useCollection(signedIn ? openDrafts : null)
  const value = useMemo<TrueWordsContextValue>(
    () => ({ words: wordList, knownWords: known, openDrafts: drafts, actions }),
    [wordList, known, drafts],
  )
  return <TrueWordsContext value={value}>{children}</TrueWordsContext>
}

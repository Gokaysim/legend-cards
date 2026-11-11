import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useCurrentProfile } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import {
  cancelDraft,
  knownWordsQuery,
  learnWord,
  openDraftsQuery,
  playerVisibleWordsQuery,
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

const allWords = trueWordsRef(db)
const playerWords = playerVisibleWordsQuery(db)
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
 * Shares the True Words in real time, with one subscription each for the whole app: the words this device reads, every
 * word someone knows now, and every open draft, plus the True Word steps bound to the app's Firestore. Each is small at
 * this table's scale. The role picks the words' query (design D3): the DM's device reads every word, drafts included,
 * and a player's device the active and retired ones; it waits for the profile. Signed out, it subscribes to nothing,
 * because the rules deny signed-out reads.
 */
export function TrueWordsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const profile = useCurrentProfile()
  const signedIn = auth.status === 'signedIn'
  const wordSource =
    !signedIn || profile.status === 'loading'
      ? null
      : profile.status === 'ready' && profile.data?.role === 'dm'
        ? allWords
        : playerWords
  const wordList = useCollection(wordSource)
  const known = useCollection(signedIn ? knownWords : null)
  const drafts = useCollection(signedIn ? openDrafts : null)
  const value = useMemo<TrueWordsContextValue>(
    () => ({ words: wordList, knownWords: known, openDrafts: drafts, actions }),
    [wordList, known, drafts],
  )
  return <TrueWordsContext value={value}>{children}</TrueWordsContext>
}

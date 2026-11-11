import type { ReactNode } from 'react'

import { db } from '@/lib/firebase/firestore'

import {
  addCard,
  addWord,
  deleteCard,
  deleteWord,
  saveCard,
  saveWord,
  setCardStatus,
  setWordStatus,
} from './api'
import { type DefinitionActions, DefinitionsContext } from './definitionsContext'

const actions: DefinitionActions = {
  addCard: (input) => addCard(db, input),
  saveCard: (input) => saveCard(db, input),
  setCardStatus: (input) => setCardStatus(db, input),
  deleteCard: (input) => deleteCard(db, input),
  addWord: (input) => addWord(db, input),
  saveWord: (input) => saveWord(db, input),
  setWordStatus: (input) => setWordStatus(db, input),
  deleteWord: (input) => deleteWord(db, input),
}

/**
 * Offers the DM's definition steps bound to the app's Firestore. It subscribes to nothing: the cards and words come from
 * their own providers, and the change records from the İşlem Logu's. The rules let only the DM run the steps.
 */
export function DefinitionsProvider({ children }: { children: ReactNode }) {
  return <DefinitionsContext value={actions}>{children}</DefinitionsContext>
}

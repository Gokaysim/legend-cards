import type { ReactNode } from 'react'

import { db } from '@/lib/firebase/firestore'
import { storage } from '@/lib/firebase/storage'

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
import { cloudPictureStore } from './pictureStore'

const pictures = cloudPictureStore(storage)

const actions: DefinitionActions = {
  addCard: (input) => addCard(db, input, pictures),
  saveCard: (input) => saveCard(db, input, pictures),
  setCardStatus: (input) => setCardStatus(db, input),
  deleteCard: (input) => deleteCard(db, input, pictures),
  addWord: (input) => addWord(db, input, pictures),
  saveWord: (input) => saveWord(db, input, pictures),
  setWordStatus: (input) => setWordStatus(db, input),
  deleteWord: (input) => deleteWord(db, input, pictures),
}

/**
 * Offers the DM's definition steps bound to the app's Firestore and Cloud Storage. It subscribes to nothing: the cards
 * and words come from their own providers, and the change records from the İşlem Logu's. The rules let only the DM run
 * the steps and store the pictures.
 */
export function DefinitionsProvider({ children }: { children: ReactNode }) {
  return <DefinitionsContext value={actions}>{children}</DefinitionsContext>
}

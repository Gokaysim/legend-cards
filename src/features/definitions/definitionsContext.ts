import { createContext, useContext } from 'react'

import type {
  AddCardInput,
  AddWordInput,
  SaveCardInput,
  SaveWordInput,
  SetCardStatusInput,
} from './api'
import type { Card } from '@/features/cards/schema'
import type { TrueWord } from '@/features/true-words/schema'

/** The DM's definition steps (spec: definition-editing), bound to a Firestore. */
export type DefinitionActions = {
  addCard: (input: AddCardInput) => Promise<string>
  saveCard: (input: SaveCardInput) => Promise<void>
  setCardStatus: (input: SetCardStatusInput) => Promise<void>
  deleteCard: (input: { card: Card; by: string }) => Promise<void>
  addWord: (input: AddWordInput) => Promise<string>
  saveWord: (input: SaveWordInput) => Promise<void>
  setWordStatus: (input: {
    word: TrueWord
    status: 'active' | 'retired'
    by: string
  }) => Promise<void>
  deleteWord: (input: { word: TrueWord; by: string }) => Promise<void>
}

export const DefinitionsContext = createContext<DefinitionActions | null>(null)

/** The DM's definition steps. Must be used inside `<DefinitionsProvider>`. */
export function useDefinitionActions(): DefinitionActions {
  const value = useContext(DefinitionsContext)
  if (!value) throw new Error('Definition hooks must be used inside <DefinitionsProvider>')
  return value
}

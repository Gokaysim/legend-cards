import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { cloudPictureStore } from '@/features/definitions/pictureStore'
import { db } from '@/lib/firebase/firestore'
import { storage } from '@/lib/firebase/storage'
import { useCollection } from '@/lib/firestore/useCollection'

import { addCharacter, charactersRef, saveCharacter, setCharacterArchived } from './api'
import {
  type CharacterActions,
  CharactersContext,
  type CharactersContextValue,
  sortCharacters,
} from './charactersContext'

const characters = charactersRef(db)
const pictures = cloudPictureStore(storage)

const actions: CharacterActions = {
  addCharacter: (input) => addCharacter(db, input, pictures),
  saveCharacter: (input) => saveCharacter(db, input, pictures),
  setCharacterArchived: (characterId, archived) => setCharacterArchived(db, characterId, archived),
}

/**
 * Shares every character in real time, with one subscription for the whole app, and the character steps (design D2
 * of add-characters). Every signed-in user reads every character; signed out, it subscribes to nothing.
 */
export function CharactersProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const subscription = useCollection(auth.status === 'signedIn' ? characters : null)
  const value = useMemo<CharactersContextValue>(
    () => ({
      characters:
        subscription.status === 'ready'
          ? { ...subscription, data: sortCharacters(subscription.data) }
          : subscription,
      actions,
    }),
    [subscription],
  )
  return <CharactersContext value={value}>{children}</CharactersContext>
}

import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { cloudPictureStore } from '@/features/definitions/pictureStore'
import { db } from '@/lib/firebase/firestore'
import { storage } from '@/lib/firebase/storage'
import { useCollection } from '@/lib/firestore/useCollection'

import {
  addCharacter,
  addEffect,
  characterEffectsRef,
  charactersRef,
  removeEffect,
  saveCharacter,
  setCharacterArchived,
} from './api'
import {
  type CharacterActions,
  CharactersContext,
  type CharactersContextValue,
  sortCharacters,
  sortEffects,
} from './charactersContext'

const characters = charactersRef(db)
const effects = characterEffectsRef(db)
const pictures = cloudPictureStore(storage)

const actions: CharacterActions = {
  addCharacter: (input) => addCharacter(db, input, pictures),
  saveCharacter: (input) => saveCharacter(db, input, pictures),
  setCharacterArchived: (characterId, archived) => setCharacterArchived(db, characterId, archived),
  addEffect: (input) => addEffect(db, input),
  removeEffect: (effectId) => removeEffect(db, effectId),
}

/**
 * Shares every character and every effect in real time, with one subscription each for the whole app, and the
 * character steps (design D2 of add-characters, D7 of add-character-effects). Every signed-in user reads them all;
 * signed out, it subscribes to nothing.
 */
export function CharactersProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const isSignedIn = auth.status === 'signedIn'
  const subscription = useCollection(isSignedIn ? characters : null)
  const effectSubscription = useCollection(isSignedIn ? effects : null)
  const value = useMemo<CharactersContextValue>(
    () => ({
      characters:
        subscription.status === 'ready'
          ? { ...subscription, data: sortCharacters(subscription.data) }
          : subscription,
      effects:
        effectSubscription.status === 'ready'
          ? { ...effectSubscription, data: sortEffects(effectSubscription.data) }
          : effectSubscription,
      actions,
    }),
    [subscription, effectSubscription],
  )
  return <CharactersContext value={value}>{children}</CharactersContext>
}

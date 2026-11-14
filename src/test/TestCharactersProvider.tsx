import { type ReactNode, useMemo } from 'react'

import {
  type CharacterActions,
  CharactersContext,
  sortCharacters,
} from '@/features/characters/charactersContext'
import type { Character } from '@/features/characters/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestCharacters = {
  /** Every character. Defaults to a ready, empty list. */
  characters?: Subscription<Character[]>
  /** Fakes for the character steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<CharacterActions>
}

export type TestCharactersProviderProps = TestCharacters & { children: ReactNode }

const SUCCEEDING_ACTIONS: CharacterActions = {
  addCharacter: () => Promise.resolve('NewCharacter01234567'),
  saveCharacter: () => Promise.resolve(),
  setCharacterArchived: () => Promise.resolve(),
}

const NO_CHARACTERS = ready<Character[]>([])

/** Provides fixed characters and fake character steps to components under test, without Firebase. */
export function TestCharactersProvider({
  characters = NO_CHARACTERS,
  actions,
  children,
}: TestCharactersProviderProps) {
  const value = useMemo(
    () => ({
      characters:
        characters.status === 'ready'
          ? { ...characters, data: sortCharacters(characters.data) }
          : characters,
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [characters, actions],
  )
  return <CharactersContext value={value}>{children}</CharactersContext>
}

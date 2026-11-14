import { createContext, useContext } from 'react'

import { profileName } from '@/features/users/usersContext'
import type { UserProfile } from '@/features/users/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import type { AddCharacterInput, SaveCharacterInput } from './api'
import type { Character } from './schema'

/** The character steps (spec: characters), bound to a Firestore and a picture store. */
export type CharacterActions = {
  addCharacter: (input: AddCharacterInput) => Promise<string>
  saveCharacter: (input: SaveCharacterInput) => Promise<void>
  setCharacterArchived: (characterId: string, archived: boolean) => Promise<void>
}

export type CharactersContextValue = {
  /** Every character, archived ones included, in the order they were added. */
  characters: Subscription<Character[]>
  actions: CharacterActions
}

export const CharactersContext = createContext<CharactersContextValue | null>(null)

function useCharactersContext(): CharactersContextValue {
  const value = useContext(CharactersContext)
  if (!value) throw new Error('Character hooks must be used inside <CharactersProvider>')
  return value
}

/** Every character, archived ones included, in the order they were added, live. */
export function useCharacters(): Subscription<Character[]> {
  return useCharactersContext().characters
}

/** The character steps. Must be used inside `<CharactersProvider>`. */
export function useCharacterActions(): CharacterActions {
  return useCharactersContext().actions
}

/** The milliseconds of a creation time; a pending one (`null`) counts as now, so it sorts last. */
function addedAt(character: Character): number {
  return character.createdAt?.toMillis() ?? Number.POSITIVE_INFINITY
}

/** Characters in the order they were added, then by ID. */
export function sortCharacters(characters: readonly Character[]): Character[] {
  return [...characters].sort((a, b) => addedAt(a) - addedAt(b) || a.id.localeCompare(b.id))
}

/** One user's characters in the order they were added: the active ones, or with `archived`, the archived ones. */
export function charactersOf(
  characters: readonly Character[],
  uid: string,
  { archived = false }: { archived?: boolean } = {},
): Character[] {
  return sortCharacters(
    characters.filter((character) => character.uid === uid && character.archived === archived),
  )
}

/** One owner's group in the use step's list. */
export type CharacterGroup = {
  uid: string
  /** The owner's name, the group's label. */
  name: string
  characters: Character[]
}

/**
 * The use step's groups (spec: card-holdings, "Choosing the character of a use"; design D8): every user's active
 * characters, the holder's group first, then the others in the order of `profiles` (the "Oyuncular" list). Users
 * without active characters, and characters whose owner has no profile, are left out.
 */
export function characterGroups(
  characters: readonly Character[],
  profiles: readonly UserProfile[],
  holderUid: string,
): CharacterGroup[] {
  const holder = profiles.filter((profile) => profile.id === holderUid)
  const others = profiles.filter((profile) => profile.id !== holderUid)
  return [...holder, ...others]
    .map((profile) => ({
      uid: profile.id,
      name: profileName(profile),
      characters: charactersOf(characters, profile.id),
    }))
    .filter((group) => group.characters.length > 0)
}

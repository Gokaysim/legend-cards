import { useState } from 'react'

import { useProfiles } from '@/features/users/usersContext'

import { type CharacterGroup, characterGroups, useCharacters } from './charactersContext'
import type { UseTarget } from './useTarget'

/** The list's choice that reveals the text field for a character without a record. */
export const TYPED_CHOICE = 'typed'

/** The use step's choice as the user makes it. */
export type CharacterChoiceState = {
  /** '' for none, `TYPED_CHOICE` for a typed name, or a character's ID. */
  value: string
  typedName: string
  /** "Aktif efekt olarak ekle": checked by default, and only offered for a chosen character. */
  addEffect: boolean
}

const EMPTY_CHOICE: CharacterChoiceState = { value: '', typedName: '', addEffect: true }

export type CharacterChoice = {
  state: CharacterChoiceState
  change: (next: Partial<CharacterChoiceState>) => void
  /** The table's active characters, the holder's group first. */
  groups: CharacterGroup[]
  /** Whether a character from the list is chosen: only then may the use add an effect. */
  isCharacterChosen: boolean
  /** What the use names: a blank typed name names none. */
  target: UseTarget
  /** Whether the use adds the effect: only for a chosen character with the box checked. */
  addEffect: boolean
}

/**
 * The state of a use step's character choice (spec: card-holdings, "Choosing the character of a use", "Adding the
 * effect of a card's use"; design D5 of add-character-effects), for a card or a True Word of `holderUid`. A chosen
 * character archived meanwhile, here or on another device, is dropped at once and reported through `onLost`, which
 * runs while the calling component renders, so it may only set that component's own state.
 */
export function useCharacterChoice(holderUid: string, onLost: () => void): CharacterChoice {
  const characters = useCharacters()
  const profiles = useProfiles()
  const [state, setState] = useState<CharacterChoiceState>(EMPTY_CHOICE)
  const groups =
    characters.status === 'ready' && profiles.status === 'ready'
      ? characterGroups(characters.data, profiles.data, holderUid)
      : []
  const isCharacterChosen = state.value !== '' && state.value !== TYPED_CHOICE
  if (
    isCharacterChosen &&
    characters.status === 'ready' &&
    !groups.some((group) => group.characters.some((character) => character.id === state.value))
  ) {
    setState({ ...state, value: '' })
    onLost()
  }
  const target: UseTarget =
    state.value === ''
      ? { kind: 'none' }
      : state.value === TYPED_CHOICE
        ? state.typedName.trim() === ''
          ? { kind: 'none' }
          : { kind: 'typed', name: state.typedName }
        : { kind: 'character', characterId: state.value }
  return {
    state,
    change: (next) => setState((current) => ({ ...current, ...next })),
    groups,
    isCharacterChosen,
    target,
    addEffect: isCharacterChosen && state.addEffect,
  }
}

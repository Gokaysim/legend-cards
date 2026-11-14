import { type ReactNode, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'

import { CharacterDetails, CharacterDialog } from './CharacterDetails'
import { CharacterFormDialog } from './CharacterFormDialog'
import { charactersOf, useCharacterActions, useCharacters } from './charactersContext'
import { CharactersTab } from './CharactersTab'
import { type CharacterFailure, characterFailureMessage, toCharacterFailure } from './errors'
import type { Character } from './schema'

/** A selected character, with the layout it was selected in, as the hand's card and word selections keep it. */
type Selection = { id: string; isWide: boolean }

/** The form that is open: a new character, or the one being edited. */
type Form = { kind: 'add' } | { kind: 'edit'; character: Character }

export type HandCharacters = {
  /** The tab's content. */
  content: ReactNode
  /** The selected character's details, for the panel beside the tab on a wide window, or `null` for none. */
  selected: { name: string; details: ReactNode } | null
  /** The dialogs: the form, and on a narrow window the selected character's details. */
  overlays: ReactNode
}

/**
 * The state of a hand's Karakterler tab (spec: characters): its tiles, the selected character, the form, and a failure
 * that arrived after a form closed. The hand screen places the parts: the content in the tab, the details in its side
 * panel on a wide window, and the dialogs.
 */
export function useHandCharacters(profile: UserProfile, isWide: boolean): HandCharacters {
  const auth = useAuth()
  const isDm = useIsDm()
  const characters = useCharacters()
  const actions = useCharacterActions()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [failure, setFailure] = useState<CharacterFailure | null>(null)
  // Crossing 1024 px clears a selection made in the other layout, so no dialog opens by itself.
  if (selection !== null && selection.isWide !== isWide) setSelection(null)

  const ownerName = profileName(profile)
  const canEdit = isDm || (auth.status === 'signedIn' && auth.user.uid === profile.id)
  const all = characters.status === 'ready' ? characters.data : []
  const active = charactersOf(all, profile.id)
  const archived = charactersOf(all, profile.id, { archived: true })
  // A character archived, here or on another device, closes its details.
  const selected = active.find((character) => character.id === selection?.id) ?? null

  const report = (error: unknown) => setFailure(toCharacterFailure(error))
  const archive = (character: Character) => {
    setFailure(null)
    setSelection(null)
    actions.setCharacterArchived(character.id, true).catch(report)
  }
  const restore = (character: Character) => {
    setFailure(null)
    actions.setCharacterArchived(character.id, false).catch(report)
  }

  const details = (character: Character) => ({
    character,
    ownerName,
    canEdit,
    onEdit: () => setForm({ kind: 'edit', character }),
    onArchive: () => archive(character),
  })

  const content =
    characters.status === 'error' ? (
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        Karakterler yüklenemedi.
      </p>
    ) : characters.status === 'loading' ? (
      <Spinner label="Karakterler yükleniyor…" className="py-12" />
    ) : (
      <div className="flex flex-col gap-3">
        {failure ? (
          <p role="alert" className="text-sm text-danger-ink">
            {characterFailureMessage(failure)}
          </p>
        ) : null}
        <CharactersTab
          name={ownerName}
          active={active}
          archived={archived}
          canEdit={canEdit}
          selectedId={isWide ? (selected?.id ?? null) : null}
          onSelect={(id) => setSelection({ id, isWide })}
          onAdd={() => {
            setFailure(null)
            setForm({ kind: 'add' })
          }}
          onRestore={restore}
        />
      </div>
    )

  // The form edits the character as it is now; one archived meanwhile can still be saved.
  const editing =
    form?.kind === 'edit'
      ? (all.find((character) => character.id === form.character.id) ?? form.character)
      : null
  const overlays = (
    <>
      {form !== null ? (
        <CharacterFormDialog
          key={form.kind === 'edit' ? form.character.id : 'new'}
          uid={profile.id}
          character={editing}
          onClose={() => setForm(null)}
          onLateFailure={setFailure}
        />
      ) : null}
      {!isWide && selected !== null && form === null ? (
        <CharacterDialog {...details(selected)} onClose={() => setSelection(null)} />
      ) : null}
    </>
  )

  return {
    content,
    selected:
      selected === null
        ? null
        : {
            name: selected.name,
            details: <CharacterDetails {...details(selected)} layout="panel" />,
          },
    overlays,
  }
}

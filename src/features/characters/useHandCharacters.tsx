import { type ReactNode, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { CharacterDetails, CharacterDialog } from './CharacterDetails'
import { CharacterEffectsList } from './CharacterEffectsList'
import { CharacterFormDialog } from './CharacterFormDialog'
import {
  charactersOf,
  effectsOf,
  useCharacterActions,
  useCharacterEffects,
  useCharacters,
} from './charactersContext'
import { CharactersTab } from './CharactersTab'
import { type CharacterFailure, characterFailureMessage, toCharacterFailure } from './errors'
import { EffectFormDialog } from './EffectFormDialog'
import type { CharacterEffect } from './effects'
import type { HeldEffect } from './heldEffects'
import type { Character } from './schema'

/** A selected character, with the layout it was selected in, as the hand's card and word selections keep it. */
type Selection = { id: string; isWide: boolean }

/** The form that is open: a new character, the one being edited, or a new effect on a character. */
type Form =
  | { kind: 'add' }
  | { kind: 'edit'; character: Character }
  | { kind: 'effect'; character: Character }

export type HandCharacters = {
  /** The tab's content. */
  content: ReactNode
  /** The selected character's details, for the panel beside the tab on a wide window, or `null` for none. */
  selected: { name: string; details: ReactNode } | null
  /** The dialogs: the form, and on a narrow window the selected character's details. */
  overlays: ReactNode
}

/**
 * The state of a hand's Karakterler tab (spec: characters, character-effects): its tiles with their effect counts, the
 * selected character with its active effects, the forms, and a failure that arrived after a form closed. `held` is
 * what the user's hand puts on every one of their characters (design D6 of add-character-effects). The hand screen
 * places the parts: the content in the tab, the details in its side panel on a wide window, and the dialogs.
 */
export function useHandCharacters(
  profile: UserProfile,
  isWide: boolean,
  held: readonly HeldEffect[] = [],
): HandCharacters {
  const auth = useAuth()
  const isDm = useIsDm()
  const characters = useCharacters()
  const allEffects = useCharacterEffects()
  const profiles = useProfiles()
  const actions = useCharacterActions()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [failure, setFailure] = useState<CharacterFailure | null>(null)
  /** A failed effect step, shown with the effects, which may be in a dialog. */
  const [effectFailure, setEffectFailure] = useState<CharacterFailure | null>(null)
  // Crossing 1024 px clears a selection made in the other layout, so no dialog opens by itself.
  if (selection !== null && selection.isWide !== isWide) setSelection(null)

  const ownerName = profileName(profile)
  const me = auth.status === 'signedIn' ? auth.user.uid : null
  const canEdit = isDm || me === profile.id
  const all = characters.status === 'ready' ? characters.data : []
  const active = charactersOf(all, profile.id)
  const archived = charactersOf(all, profile.id, { archived: true })
  // A character archived, here or on another device, closes its details.
  const selected = active.find((character) => character.id === selection?.id) ?? null

  const effects = allEffects.status === 'ready' ? allEffects.data : []
  const effectCounts = new Map(
    active.map((character) => [
      character.id,
      effectsOf(effects, character.id).length + held.length,
    ]),
  )
  const nameOf = (uid: string) => {
    const found = profiles.status === 'ready' ? profiles.data.find((p) => p.id === uid) : undefined
    return found === undefined ? 'Bilinmeyen kullanıcı' : profileName(found)
  }
  // Spec: character-effects, "Removing an effect".
  const canRemove = (effect: CharacterEffect) => {
    if (isDm) return true
    if (me === null || effect.source === 'dm') return false
    return effect.uid === me || (effect.source !== 'own' && effect.createdBy === me)
  }
  const reportEffect = (error: unknown) => setEffectFailure(toCharacterFailure(error))
  const removeEffect = (effect: CharacterEffect) => {
    setEffectFailure(null)
    actions.removeEffect(effect.id).catch(reportEffect)
  }

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
    effects: (
      <div className="flex flex-col gap-2">
        {effectFailure ? (
          <p role="alert" className="text-sm text-danger-ink">
            {characterFailureMessage(effectFailure)}
          </p>
        ) : null}
        <CharacterEffectsList
          held={held}
          effects={effectsOf(effects, character.id)}
          canRemove={canRemove}
          onRemove={removeEffect}
          nameOf={nameOf}
          onAdd={
            canEdit
              ? () => {
                  setEffectFailure(null)
                  setForm({ kind: 'effect', character })
                }
              : null
          }
        />
      </div>
    ),
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
          effectCounts={effectCounts}
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
      {form?.kind === 'effect' && me !== null ? (
        <EffectFormDialog
          characterName={form.character.name}
          isDm={isDm}
          onSave={({ name, text }) => {
            actions
              .addEffect({ character: form.character, name, text, by: me, isDm })
              .catch(reportEffect)
          }}
          onClose={() => setForm(null)}
        />
      ) : null}
      {form !== null && form.kind !== 'effect' ? (
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

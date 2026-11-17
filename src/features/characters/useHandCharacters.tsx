import { type ReactNode, useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { ArchivedCharactersDialog } from './ArchivedCharactersDialog'
import { CharacterDetails } from './CharacterDetails'
import { CharacterEffectsList } from './CharacterEffectsList'
import { CharacterFormDialog } from './CharacterFormDialog'
import type { CharacterTabEntry } from './CharacterTab'
import {
  charactersOf,
  effectsOf,
  useCharacterActions,
  useCharacterEffects,
  useCharacters,
} from './charactersContext'
import { effectRows } from './effectRows'
import { type CharacterFailure, characterFailureMessage, toCharacterFailure } from './errors'
import { EffectFormDialog } from './EffectFormDialog'
import type { CharacterEffect } from './effects'
import type { HeldEffect } from './heldEffects'
import type { Character } from './schema'

/** The form that is open: a new character, the one being edited, or a new effect on a character. */
type Form =
  | { kind: 'add' }
  | { kind: 'edit'; character: Character }
  | { kind: 'effect'; character: Character }

export type HandCharacters = {
  /** The IDs of the hand user's active characters in the order added, or `null` while they load or cannot be read. */
  activeIds: readonly string[] | null
  /** Each active character with its effects, for its tab in the hand's tab row. */
  tabs: readonly CharacterTabEntry[]
  /** How many characters the hand's user has archived. */
  archivedCount: number
  /** Opens the form for a new character: for the hand's user and the DM, `null` for anyone else. */
  onAdd: (() => void) | null
  /** Opens the archived characters. */
  onOpenArchive: () => void
  /** The view of an open character: its details with its effects, or why it cannot show. */
  viewOf: (characterId: string) => ReactNode
  /** A character step that failed after its form closed, shown under the tab row on every tab. */
  notice: ReactNode
  /** The dialogs: the character form, the effect form and the archived characters. */
  overlays: ReactNode
}

/**
 * The characters of a hand (spec: characters, character-effects; design D3 of redesign-hand-dashboard): each active
 * character's tab with its effects, the open character's view, the forms, the archived characters, and a failure that
 * arrived after a form closed. The open character comes from the URL, which the hand screen reads and passes in as
 * `openId`; `onAdded` opens a character just added once it shows. `held` is what the user's hand puts on every one of their characters (design D6
 * of add-character-effects).
 */
export function useHandCharacters(
  profile: UserProfile,
  held: readonly HeldEffect[],
  openId: string | null,
  onAdded: (characterId: string) => void,
): HandCharacters {
  const auth = useAuth()
  const isDm = useIsDm()
  const characters = useCharacters()
  const allEffects = useCharacterEffects()
  const profiles = useProfiles()
  const actions = useCharacterActions()
  /** The active characters when an add was saved: the first other one to show is the new one (design D4). */
  const [pendingAdd, setPendingAdd] = useState<ReadonlySet<string> | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [failure, setFailure] = useState<CharacterFailure | null>(null)
  /** A failed effect step, shown with the effects, which may be in a dialog. */
  const [effectFailure, setEffectFailure] = useState<CharacterFailure | null>(null)
  const ownerName = profileName(profile)
  const me = auth.status === 'signedIn' ? auth.user.uid : null
  const canEdit = isDm || me === profile.id
  const all = characters.status === 'ready' ? characters.data : []
  const active = charactersOf(all, profile.id)
  const archived = charactersOf(all, profile.id, { archived: true })
  // A character just added opens once it shows, offline at once (design D4).
  const addedId =
    pendingAdd === null ? undefined : active.find((character) => !pendingAdd.has(character.id))?.id
  // Opening it changes the URL, which belongs to the router; once the URL names it, the add is done.
  useEffect(() => {
    if (addedId !== undefined) onAdded(addedId)
  }, [addedId, onAdded])
  if (addedId !== undefined && addedId === openId) setPendingAdd(null)

  const effects = allEffects.status === 'ready' ? allEffects.data : []
  const tabs = active.map((character) => ({
    character,
    effects: effectRows(held, effectsOf(effects, character.id)),
  }))
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
    actions.setCharacterArchived(character.id, true).catch(report)
  }
  const restore = (character: Character) => {
    setFailure(null)
    actions.setCharacterArchived(character.id, false).catch(report)
  }

  const viewOf = (characterId: string): ReactNode => {
    if (characters.status === 'error') {
      return (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          Karakterler yüklenemedi.
        </p>
      )
    }
    if (characters.status === 'loading') {
      return <Spinner label="Karakterler yükleniyor…" className="py-12" />
    }
    const character = active.find((candidate) => candidate.id === characterId)
    if (character === undefined) return null
    return (
      <section
        aria-label={`${ownerName} — ${character.name}`}
        className="rounded-xl border border-line bg-pane p-4"
      >
        <CharacterDetails
          character={character}
          ownerName={ownerName}
          canEdit={canEdit}
          onEdit={() => setForm({ kind: 'edit', character })}
          onArchive={() => archive(character)}
          effects={
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
          }
        />
      </section>
    )
  }

  const notice =
    failure !== null && !isArchiveOpen ? (
      <p role="alert" className="text-sm text-danger-ink">
        {characterFailureMessage(failure)}
      </p>
    ) : null

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
          onSaved={() => setPendingAdd(new Set(active.map((character) => character.id)))}
          onLateFailure={(late) => {
            setPendingAdd(null)
            setFailure(late)
          }}
        />
      ) : null}
      {isArchiveOpen ? (
        <ArchivedCharactersDialog
          archived={archived}
          canEdit={canEdit}
          onRestore={restore}
          failure={failure === null ? null : characterFailureMessage(failure)}
          onClose={() => setIsArchiveOpen(false)}
        />
      ) : null}
    </>
  )

  return {
    activeIds: characters.status === 'ready' ? active.map((character) => character.id) : null,
    tabs,
    archivedCount: archived.length,
    onAdd: canEdit
      ? () => {
          setFailure(null)
          setForm({ kind: 'add' })
        }
      : null,
    onOpenArchive: () => {
      setFailure(null)
      setIsArchiveOpen(true)
    },
    viewOf,
    notice,
    overlays,
  }
}

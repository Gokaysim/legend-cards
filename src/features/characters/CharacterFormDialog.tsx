import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { FormField } from '@/features/definitions/DefinitionForm'
import { FIELD_CLASSES } from '@/features/definitions/fieldClasses'
import { PictureField } from '@/features/definitions/PictureField'
import { choiceOf, KEEP_DRAFT, type PictureDraft } from '@/features/definitions/pictureDraft'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCharacterActions } from './charactersContext'
import { type CharacterFailure, characterFailureMessage, toCharacterFailure } from './errors'
import { type Character, CHARACTER_LIMITS } from './schema'

export type CharacterFormDialogProps = {
  /** The owner of a new character: the hand's user. */
  uid: string
  /** The character to edit, or `null` to add one. */
  character: Character | null
  onClose: () => void
  /** Reports a failure that arrives after the form closed: a write without a new photo does not wait for the server. */
  onLateFailure: (failure: CharacterFailure) => void
}

/**
 * The character form (spec: characters, "Adding a character from the tab", "Editing in the details"): the name and an
 * optional photo, cropped to 3:4. A save with a new photo waits for the upload and the server, and keeps the form with
 * a Turkish message when it fails, offline included. Any other save is queued like a note: the form closes at once.
 */
export function CharacterFormDialog({
  uid,
  character,
  onClose,
  onLateFailure,
}: CharacterFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const by = auth.status === 'signedIn' ? auth.user.uid : ''
  const actions = useCharacterActions()
  const isOnline = useOnlineStatus()
  const [name, setName] = useState(character?.name ?? '')
  const [photo, setPhoto] = useState<PictureDraft>(KEEP_DRAFT)
  const [isWorking, setIsWorking] = useState(false)
  const [isNameMissing, setIsNameMissing] = useState(false)
  const [failure, setFailure] = useState<CharacterFailure | null>(null)

  const step = () =>
    character === null
      ? actions.addCharacter({ uid, name, by, picture: choiceOf(photo) })
      : actions.saveCharacter({ character, name, picture: choiceOf(photo) })

  const save = async () => {
    setFailure(null)
    if (name.trim() === '') {
      setIsNameMissing(true)
      return
    }
    if (photo.kind !== 'new') {
      step().catch((error: unknown) => onLateFailure(toCharacterFailure(error)))
      onClose()
      return
    }
    if (!isOnline) {
      setFailure({ kind: 'photo-offline' })
      return
    }
    setIsWorking(true)
    try {
      await step()
      onClose()
    } catch (error) {
      setFailure(toCharacterFailure(error))
      setIsWorking(false)
    }
  }

  const title = character === null ? 'Yeni karakter' : `Karakteri düzenle: ${character.name}`
  return (
    <Dialog title={title} onClose={onClose} className="max-w-lg">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <FormField label="Ad" htmlFor={`${ids}-name`}>
          <input
            id={`${ids}-name`}
            data-autofocus
            value={name}
            maxLength={CHARACTER_LIMITS.name}
            aria-invalid={isNameMissing || undefined}
            aria-describedby={isNameMissing ? `${ids}-name-problem` : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setIsNameMissing(false)
            }}
            className={FIELD_CLASSES}
          />
          {isNameMissing ? (
            <span id={`${ids}-name-problem`} className="text-sm text-danger-ink">
              Karakterin bir adı olmalı.
            </span>
          ) : null}
        </FormField>

        <PictureField
          title="Karakter fotoğrafı"
          shape="portrait"
          stored={character?.picture ?? null}
          draft={photo}
          onChange={setPhoto}
          name={name.trim() || 'Karakter'}
          disabled={isWorking}
        />

        {failure ? (
          <p role="alert" className="text-sm text-danger-ink">
            {characterFailureMessage(failure)}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose} disabled={isWorking}>
            Vazgeç
          </Button>
          <Button type="submit" variant="primary" disabled={isWorking}>
            {isWorking ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

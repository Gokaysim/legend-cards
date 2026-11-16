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
import { readSheetUrl } from './sheetUrl'

export type CharacterFormDialogProps = {
  /** The owner of a new character: the hand's user. */
  uid: string
  /** The character to edit, or `null` to add one. */
  character: Character | null
  onClose: () => void
  /** Called for a new character when the form saves it, just before it closes. */
  onSaved?: () => void
  /** Reports a failure that arrives after the form closed: a write without a new photo does not wait for the server. */
  onLateFailure: (failure: CharacterFailure) => void
}

/** Why a typed sheet link is refused (design D4 of add-character-sheet-link). */
type SheetUrlProblem = 'wrong-start' | 'invalid'

const SHEET_URL_MESSAGES: Record<SheetUrlProblem, string> = {
  'wrong-start': 'Link http:// ya da https:// ile başlamalı.',
  invalid: 'Bu geçerli bir link değil.',
}

/**
 * The character form (spec: characters, "Adding a character from the tab", "Editing in the details", "The sheet link
 * in the form"): the name, an optional photo, cropped to 3:4, and an optional sheet link. A save with a new photo waits
 * for the upload and the server, and keeps the form with a Turkish message when it fails, offline included. Any other
 * save is queued like a note: the form closes at once.
 */
export function CharacterFormDialog({
  uid,
  character,
  onClose,
  onSaved,
  onLateFailure,
}: CharacterFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const by = auth.status === 'signedIn' ? auth.user.uid : ''
  const actions = useCharacterActions()
  const isOnline = useOnlineStatus()
  const [name, setName] = useState(character?.name ?? '')
  const [photo, setPhoto] = useState<PictureDraft>(KEEP_DRAFT)
  const [sheetText, setSheetText] = useState(character?.sheetUrl ?? '')
  const [isWorking, setIsWorking] = useState(false)
  const [isNameMissing, setIsNameMissing] = useState(false)
  const [sheetUrlProblem, setSheetUrlProblem] = useState<SheetUrlProblem | null>(null)
  const [failure, setFailure] = useState<CharacterFailure | null>(null)

  const step = (sheetUrl: string | null) =>
    character === null
      ? actions.addCharacter({ uid, name, by, picture: choiceOf(photo), sheetUrl })
      : actions.saveCharacter({ character, name, picture: choiceOf(photo), sheetUrl })

  const save = async () => {
    setFailure(null)
    const sheet = readSheetUrl(sheetText)
    const isNameBlank = name.trim() === ''
    setIsNameMissing(isNameBlank)
    setSheetUrlProblem(sheet.kind === 'wrong-start' || sheet.kind === 'invalid' ? sheet.kind : null)
    if (isNameBlank || sheet.kind === 'wrong-start' || sheet.kind === 'invalid') return
    const sheetUrl = sheet.kind === 'link' ? sheet.url : null
    if (photo.kind !== 'new') {
      step(sheetUrl).catch((error: unknown) => onLateFailure(toCharacterFailure(error)))
      if (character === null) onSaved?.()
      onClose()
      return
    }
    if (!isOnline) {
      setFailure({ kind: 'photo-offline' })
      return
    }
    setIsWorking(true)
    try {
      await step(sheetUrl)
      if (character === null) onSaved?.()
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
        noValidate
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

        <FormField label="Karakter kağıdı linki" htmlFor={`${ids}-sheet`}>
          <input
            id={`${ids}-sheet`}
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoCapitalize="none"
            value={sheetText}
            maxLength={CHARACTER_LIMITS.sheetUrl}
            placeholder="https://…"
            disabled={isWorking}
            aria-invalid={sheetUrlProblem !== null || undefined}
            aria-describedby={
              sheetUrlProblem !== null
                ? `${ids}-sheet-problem ${ids}-sheet-hint`
                : `${ids}-sheet-hint`
            }
            onChange={(event) => {
              setSheetText(event.target.value)
              setSheetUrlProblem(null)
            }}
            className={FIELD_CLASSES}
          />
          <span id={`${ids}-sheet-hint`} className="text-xs text-ink-muted">
            İsteğe bağlı. Örneğin Google Docs ya da Myth-Weavers linki.
          </span>
          {sheetUrlProblem !== null ? (
            <span id={`${ids}-sheet-problem`} className="text-sm text-danger-ink">
              {SHEET_URL_MESSAGES[sheetUrlProblem]}
            </span>
          ) : null}
        </FormField>

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

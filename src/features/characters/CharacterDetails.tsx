import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

import { CharacterPortrait } from './CharacterPortrait'
import type { Character } from './schema'

export type CharacterDetailsProps = {
  character: Character
  /** The owner's name. */
  ownerName: string
  /** Whether the signed-in user may edit it: its owner or the DM. */
  canEdit: boolean
  /** Opens the character's form. */
  onEdit: () => void
  /** Archives it. */
  onArchive: () => void
  /** The character's "Aktif efektler" (spec: character-effects). */
  effects?: ReactNode
}

/**
 * The selected character's view under the character tabs (spec: characters, "The selected character's view", "Editing
 * in the details"; design D2 of redesign-characters-tab): its photo in a large 3:4 frame, at the left of the rest from
 * 640 px and above it on a phone; its name and its owner; for the owner and the DM "✎ Düzenle" and "Arşivle"; then its
 * active effects.
 */
export function CharacterDetails({
  character,
  ownerName,
  canEdit,
  onEdit,
  onArchive,
  effects,
}: CharacterDetailsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <CharacterPortrait character={character} className="mx-auto max-w-56 sm:max-w-none" />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold break-words text-ink">{character.name}</h3>
          <p className="text-sm text-ink-muted">Sahibi: {ownerName}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={onEdit}>✎ Düzenle</Button>
            <Button variant="danger" onClick={onArchive}>
              Arşivle
            </Button>
          </div>
        ) : null}
        {effects}
      </div>
    </div>
  )
}

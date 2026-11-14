import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'

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
  /** `panel` beside the tiles on a wide window, `dialog` on a narrow one. */
  layout: 'panel' | 'dialog'
  /** The character's "Aktif efektler" (spec: character-effects). */
  effects?: ReactNode
}

/**
 * A character's details (spec: characters, "Character details beside the tiles", "Editing in the details"): its photo,
 * its name and its owner, for the owner and the DM "✎ Düzenle" and "Arşivle", then its active effects.
 */
export function CharacterDetails({
  character,
  ownerName,
  canEdit,
  onEdit,
  onArchive,
  layout,
  effects,
}: CharacterDetailsProps) {
  return (
    <div className="flex flex-col gap-4">
      <CharacterPortrait
        character={character}
        className={cn('mx-auto', layout === 'panel' ? 'max-w-66' : 'max-w-56')}
      />
      <div className="flex flex-col gap-1 text-center">
        <p className="text-lg font-semibold break-words text-ink">{character.name}</p>
        <p className="text-sm text-ink-muted">Sahibi: {ownerName}</p>
      </div>
      {canEdit ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onEdit}>✎ Düzenle</Button>
          <Button variant="danger" onClick={onArchive}>
            Arşivle
          </Button>
        </div>
      ) : null}
      {effects}
    </div>
  )
}

/** A character's details in a dialog, where the window is too narrow for the panel beside the tiles. */
export function CharacterDialog({
  onClose,
  ...details
}: Omit<CharacterDetailsProps, 'layout'> & { onClose: () => void }) {
  return (
    <Dialog title={details.character.name} onClose={onClose} className="max-w-md">
      <CharacterDetails {...details} layout="dialog" />
    </Dialog>
  )
}

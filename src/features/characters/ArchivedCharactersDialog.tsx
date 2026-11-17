import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

import { CharacterPortrait } from './CharacterPortrait'
import type { Character } from './schema'

export type ArchivedCharactersDialogProps = {
  /** The archived characters of the hand's user, in the order added. */
  archived: readonly Character[]
  /** Whether the signed-in user may bring them back: their owner or the DM. */
  canEdit: boolean
  onRestore: (character: Character) => void
  /** A failure to show, for example of a "Geri al". */
  failure?: string | null
  onClose: () => void
}

/**
 * The archived characters of a hand (spec: characters, "Archived characters on the tab"; redesign-hand-dashboard),
 * opened from "Arşiv (<n>)" in the hand's tab row: each with its photo and name, and for the owner and the DM "Geri al".
 */
export function ArchivedCharactersDialog({
  archived,
  canEdit,
  onRestore,
  failure = null,
  onClose,
}: ArchivedCharactersDialogProps) {
  return (
    <Dialog title="Arşivlenen karakterler" onClose={onClose} closeOnBackdrop>
      <div className="flex flex-col gap-3">
        {failure !== null ? (
          <p role="alert" className="text-sm text-danger-ink">
            {failure}
          </p>
        ) : null}
        {archived.length === 0 ? (
          <p className="text-sm text-ink-muted">Arşivlenen karakter yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archived.map((character) => (
              <li key={character.id} className="flex items-center gap-3">
                <CharacterPortrait
                  character={character}
                  size="small"
                  isDecorative
                  className="w-10 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{character.name}</span>
                {canEdit ? <Button onClick={() => onRestore(character)}>Geri al</Button> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}

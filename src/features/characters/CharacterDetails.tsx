import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

import { CharacterPortrait } from './CharacterPortrait'
import type { Character } from './schema'
import { sheetSiteName } from './sheetUrl'

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
 * 640 px and above it on a phone; its name, its owner and its sheet link; for the owner and the DM "✎ Düzenle" and
 * "Arşivle"; then its active effects.
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
          {character.sheetUrl ? <SheetLink url={character.sheetUrl} /> : null}
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

/**
 * The character's sheet link (spec: characters, "Opening a character sheet"; design D5 of add-character-sheet-link),
 * for everyone who sees the view. It opens in a new tab, with the site's name beside it. The address is an `http(s)`
 * one: the stored check (`characterSchema`, `firestore.rules`) lets no other start through.
 */
function SheetLink({ url }: { url: string }) {
  const site = sheetSiteName(url)
  return (
    <p className="text-sm break-all">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold underline-offset-2 hover:underline focus-visible:underline"
      >
        📄 Karakter kağıdı <span className="sr-only">(yeni sekmede açılır)</span>
      </a>
      {site !== null ? <span className="text-ink-muted"> · {site}</span> : null}
    </p>
  )
}

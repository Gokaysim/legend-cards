import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

import { CharacterPortrait } from './CharacterPortrait'
import type { Character } from './schema'

export type CharacterTileProps = {
  character: Character
  isSelected: boolean
  onSelect: () => void
}

/** A character's tile (spec: characters, "Character tiles"): its 3:4 frame and its name, a button that selects it. */
export function CharacterTile({ character, isSelected, onSelect }: CharacterTileProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 rounded-xl border bg-pane p-2 text-left transition-colors hover:bg-pane-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        isSelected ? 'border-gold' : 'border-line',
      )}
    >
      <CharacterPortrait character={character} isDecorative />
      <span className="truncate px-1 text-sm font-medium text-ink">{character.name}</span>
    </button>
  )
}

export type CharactersTabProps = {
  /** The hand's user's name. */
  name: string
  /** Their active characters, in the order added. */
  active: readonly Character[]
  /** Their archived characters, in the order added. */
  archived: readonly Character[]
  /** Whether the signed-in user may add and edit them: the hand's user or the DM. */
  canEdit: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRestore: (character: Character) => void
}

/**
 * The hand's Karakterler tab (spec: characters, "Karakterler tab"): the user's active characters as tiles, "Karakter
 * ekle" for that user and the DM, and the collapsed list of archived characters with "Geri al".
 */
export function CharactersTab({
  name,
  active,
  archived,
  canEdit,
  selectedId,
  onSelect,
  onAdd,
  onRestore,
}: CharactersTabProps) {
  const ids = useId()
  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-pane p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-title`} className="font-semibold text-ink">
          {`${name} — Karakterler`}
        </h2>
        <p className="text-sm text-ink-muted">{`${active.length} karakter`}</p>
      </div>
      {active.length === 0 && !canEdit ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Henüz karakter yok.
        </p>
      ) : (
        <ul
          aria-label="Karakterler"
          className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3"
        >
          {active.map((character) => (
            <li key={character.id} className="flex">
              <CharacterTile
                character={character}
                isSelected={character.id === selectedId}
                onSelect={() => onSelect(character.id)}
              />
            </li>
          ))}
          {canEdit ? (
            <li className="flex">
              <button
                type="button"
                onClick={onAdd}
                className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-dashed border-control-line p-2 text-ink-muted transition-colors hover:bg-pane-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span
                  aria-hidden="true"
                  className="flex aspect-[3/4] w-full items-center justify-center text-4xl"
                >
                  +
                </span>
                <span className="px-1 text-sm font-medium">Karakter ekle</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}
      {active.length === 0 && canEdit ? (
        <p className="text-sm text-ink-muted">Henüz karakter yok.</p>
      ) : null}
      {archived.length > 0 ? (
        <details className="rounded-xl border border-line bg-sidebar p-3">
          <summary className="cursor-pointer text-sm text-ink-muted">
            {`Arşivlenen karakterler (${archived.length})`}
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
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
        </details>
      ) : null}
    </section>
  )
}

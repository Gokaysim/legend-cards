import { type ReactNode, useId } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

import { CharacterPortrait } from './CharacterPortrait'
import type { Character } from './schema'

export type CharacterTabProps = {
  character: Character
  /** The tab's element ID, which the view names as its label. */
  id: string
  /** The view's element ID. */
  controls: string
  isSelected: boolean
  onSelect: () => void
  /** How many effects are on it, held ones included (spec: character-effects, "The effect count on a character's tab"). */
  effectCount?: number
}

/**
 * A character's tab (spec: characters, "Character tabs"; design D1 of redesign-characters-tab): a small 3:4 thumbnail of
 * its photo, its name, and "✦ <count>" when effects are on it. Marked with a gold border while selected.
 */
export function CharacterTab({
  character,
  id,
  controls,
  isSelected,
  onSelect,
  effectCount = 0,
}: CharacterTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={isSelected}
      aria-controls={controls}
      onClick={onSelect}
      className={cn(
        'flex max-w-full min-w-0 items-center gap-2 rounded-xl border py-1 pr-3 pl-1 text-left transition-colors hover:bg-pane-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        isSelected ? 'border-gold bg-pane-raised' : 'border-line bg-pane',
      )}
    >
      <CharacterPortrait
        character={character}
        size="small"
        isDecorative
        className="w-8 shrink-0 rounded-md"
      />
      <span className="max-w-40 min-w-0 truncate text-sm font-medium text-ink">
        {character.name}
      </span>
      {effectCount > 0 ? (
        <>
          <span
            aria-hidden="true"
            data-effect-count=""
            className="shrink-0 text-xs font-semibold text-gold"
          >
            ✦ {effectCount}
          </span>
          <span className="sr-only">, {effectCount} aktif efekt</span>
        </>
      ) : null}
    </button>
  )
}

export type CharactersTabProps = {
  /** The hand's user's name. */
  name: string
  /** Their active characters, in the order added. */
  active: readonly Character[]
  /** How many effects each active character has, by its ID. */
  effectCounts?: ReadonlyMap<string, number>
  /** Their archived characters, in the order added. */
  archived: readonly Character[]
  /** Whether the signed-in user may add and edit them: the hand's user or the DM. */
  canEdit: boolean
  /** The character whose view shows, or `null` when there is none. */
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRestore: (character: Character) => void
  /** The selected character's view, shown under the tabs. */
  view?: ReactNode
}

/**
 * The hand's Karakterler tab (spec: characters, "Karakterler tab"; design D1, D5 of redesign-characters-tab): the user's
 * active characters as a wrapping row of tabs, "+ Karakter ekle" for that user and the DM, the selected character's
 * view under the row, and the collapsed list of archived characters with "Geri al".
 */
export function CharactersTab({
  name,
  active,
  effectCounts,
  archived,
  canEdit,
  selectedId,
  onSelect,
  onAdd,
  onRestore,
  view,
}: CharactersTabProps) {
  const ids = useId()
  const tabId = (characterId: string) => `${ids}-tab-${characterId}`
  const viewId = `${ids}-view`
  const selected = active.find((character) => character.id === selectedId) ?? null
  const addButton = canEdit ? (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-control-line px-3 py-1 text-sm font-medium text-ink-muted transition-colors hover:bg-pane-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span aria-hidden="true">+</span> Karakter ekle
    </button>
  ) : null
  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-4 rounded-xl border border-line bg-pane p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-title`} className="font-semibold text-ink">
          {`${name} — Karakterler`}
        </h2>
        <p className="text-sm text-ink-muted">{`${active.length} karakter`}</p>
      </div>
      {active.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ink-muted">Henüz karakter yok.</p>
          {addButton}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <div role="tablist" aria-label="Karakterler" className="flex min-w-0 flex-wrap gap-2">
              {active.map((character) => (
                <CharacterTab
                  key={character.id}
                  character={character}
                  id={tabId(character.id)}
                  controls={viewId}
                  isSelected={character.id === selected?.id}
                  onSelect={() => onSelect(character.id)}
                  effectCount={effectCounts?.get(character.id) ?? 0}
                />
              ))}
            </div>
            {addButton}
          </div>
          {selected !== null ? (
            <div
              role="tabpanel"
              id={viewId}
              aria-labelledby={tabId(selected.id)}
              className="border-t border-line pt-4"
            >
              {view}
            </div>
          ) : null}
        </>
      )}
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

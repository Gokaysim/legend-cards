import { CharacterTab, type CharacterTabEntry } from '@/features/characters/CharacterTab'
import { cn } from '@/lib/cn'

import { type OpenTab, tabKey } from './handTabs'

export type HandTabRowProps = {
  /** A prefix from `useId()`, shared with the `TabPanel` the tabs control. */
  idPrefix: string
  open: OpenTab
  onChoose: (tab: OpenTab) => void
  /** The active characters of the hand's user, in the order added. */
  characters: readonly CharacterTabEntry[]
  /** "+", which adds a character: for the hand's user and the DM, `null` for anyone else. */
  onAdd: (() => void) | null
  /** How many characters the hand's user has archived. */
  archivedCount: number
  onOpenArchive: () => void
  isDm: boolean
}

/** The ID of a tab in the row with this prefix, as `TabList` names its tabs. */
function handTabId(idPrefix: string, tab: OpenTab): string {
  return `${idPrefix}-tab-${tabKey(tab)}`
}

/** The ID of the panel the row's tabs control, as `TabPanel` names it. */
function panelId(idPrefix: string): string {
  return `${idPrefix}-panel`
}

/** A tab's look: underlined in gold while open (the canvas's "V2"). */
function tabClass(isOpen: boolean): string {
  return cn(
    'min-h-11 border-b-3 px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold',
    isOpen
      ? 'border-gold font-semibold text-gold'
      : 'border-transparent font-medium text-ink-muted hover:bg-pane-raised hover:text-ink',
  )
}

const CARDS: OpenTab = { kind: 'cards' }
const TRUE_WORDS: OpenTab = { kind: 'true-words' }
const DM_NOTE: OpenTab = { kind: 'dm-note' }

/**
 * The hand's tab row under the stats (spec: card-holdings, "The hand's tab row"; design D2 of
 * redesign-hand-dashboard): "♠ Kartlar", "✦ True Words", a tab for each active character, "+" to add one, "Arşiv
 * (<n>)" when some are archived, and for the DM "🔒 DM notu" at the end. One tablist holds the tabs; "+" and "Arşiv"
 * are buttons beside it, and the DM notu tab, after them, belongs to the tablist through `aria-owns`, so the Tab key
 * follows the row as it shows. The row wraps on a narrow window.
 */
export function HandTabRow({
  idPrefix,
  open,
  onChoose,
  characters,
  onAdd,
  archivedCount,
  onOpenArchive,
  isDm,
}: HandTabRowProps) {
  const openKey = tabKey(open)
  const fixedTab = (tab: OpenTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={handTabId(idPrefix, tab)}
      aria-selected={openKey === tabKey(tab)}
      aria-controls={panelId(idPrefix)}
      onClick={() => onChoose(tab)}
      className={tabClass(openKey === tabKey(tab))}
    >
      {label}
    </button>
  )
  return (
    <div className="flex flex-wrap items-stretch gap-x-1 border-b border-line">
      <div
        role="tablist"
        aria-label="El"
        aria-owns={isDm ? handTabId(idPrefix, DM_NOTE) : undefined}
        className="flex max-w-full min-w-0 flex-wrap items-stretch gap-x-1"
      >
        {fixedTab(CARDS, '♠ Kartlar')}
        {fixedTab(TRUE_WORDS, '✦ True Words')}
        {characters.length > 0 ? (
          <span aria-hidden="true" className="mx-1 my-3 w-px self-stretch bg-line" />
        ) : null}
        {characters.map(({ character, effects }) => {
          const tab: OpenTab = { kind: 'character', id: character.id }
          const isOpen = openKey === tabKey(tab)
          return (
            <CharacterTab
              key={character.id}
              character={character}
              id={handTabId(idPrefix, tab)}
              controls={panelId(idPrefix)}
              isSelected={isOpen}
              onSelect={() => onChoose(tab)}
              effects={effects}
              className={cn(tabClass(isOpen), 'pl-2')}
            />
          )
        })}
      </div>
      {onAdd !== null ? (
        <button
          type="button"
          aria-label="Karakter ekle"
          onClick={onAdd}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-ink-muted transition-colors hover:bg-pane-raised hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}
      {archivedCount > 0 ? (
        <button
          type="button"
          onClick={onOpenArchive}
          className="min-h-11 rounded-lg px-2 text-sm text-ink-muted transition-colors hover:bg-pane-raised hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          {`Arşiv (${archivedCount})`}
        </button>
      ) : null}
      {isDm ? (
        <>
          <span aria-hidden="true" className="flex-1" />
          {fixedTab(DM_NOTE, '🔒 DM notu')}
        </>
      ) : null}
    </div>
  )
}

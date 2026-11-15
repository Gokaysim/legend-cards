import { Link } from 'react-router'

import { cardHistoryPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { useSetIndex } from '@/features/sets/setsContext'
import { cn } from '@/lib/cn'

import { NO_VALUE, rarityLabel, type SetName, setLabel } from './display'
import type { Definition } from './schema'
import { DM_ONLY_MARK } from './status'
import type { CardSort, SortKey, StatusText } from './sort'
import { PLAIN_COLUMNS } from './tableColumns'
import { visibleText } from './text'

type Column = {
  key: SortKey
  label: string
  cell: (card: Definition, statusText: StatusText, setName: SetName) => string
  wide?: boolean
}

const COLUMNS: Record<SortKey, Column> = {
  name: { key: 'name', label: 'Kart', cell: (card) => card.name },
  set: {
    key: 'set',
    label: 'Set',
    cell: (card, _statusText, setName) => setLabel(card, setName) ?? NO_VALUE,
  },
  cost: { key: 'cost', label: 'Cost', cell: (card) => card.cost ?? NO_VALUE },
  rarity: { key: 'rarity', label: 'Rarity', cell: (card) => rarityLabel(card) ?? NO_VALUE },
  mechanicPack: {
    key: 'mechanicPack',
    label: 'Mechanic Pack',
    cell: (card) => card.mechanicPack ?? NO_VALUE,
  },
  text: {
    key: 'text',
    label: 'Metin',
    cell: (card) => visibleText(card.text) || NO_VALUE,
    wide: true,
  },
  status: {
    key: 'status',
    label: 'Durum',
    cell: (card, statusText) => statusText(card) ?? NO_VALUE,
  },
}

/** A small mark beside a row's name. */
const ROW_MARK_CLASSES =
  'ml-2 rounded-full border px-1.5 py-0.5 text-xs font-normal whitespace-nowrap text-ink-muted'

const DIRECTION_LABELS = { asc: 'artan', desc: 'azalan' } as const

export type CardTableProps<T extends Definition> = {
  /** The columns, in order: `LEGEND_COLUMNS` or `PLAIN_COLUMNS` (see `tableColumns`). */
  columns: readonly SortKey[]
  /** Already filtered and sorted. */
  cards: readonly T[]
  sort: CardSort
  /** Called with the column the user selected. The caller decides the new direction. */
  onSort: (key: SortKey) => void
  /** The Durum text of a card. Without it, the column shows "—". */
  statusText?: StatusText
  /** For the DM: an İşlem column with each card's "✎ Düzenle". */
  onEdit?: (card: T) => void
  /** For the DM: marks "🔒 DM" beside its name the row of a card whose "Listede görünür" is off. */
  marksHidden?: boolean
  /** In the True Words tab: marks "Biliyor" beside its name the row of a word the chosen player knows. */
  isKnown?: (card: T) => boolean
  /** In the Kartlar and Cursed tabs: each name links to the card's Kart geçmişi. */
  linksHistory?: boolean
}

/** The list view: one row per card. Only the table scrolls sideways at narrow widths, never the page. */
export function CardTable<T extends Definition>({
  columns: columnKeys,
  cards,
  sort,
  onSort,
  statusText = () => null,
  onEdit,
  marksHidden = false,
  isKnown,
  linksHistory = false,
}: CardTableProps<T>) {
  const columns = columnKeys.map((key) => COLUMNS[key])
  const { setName } = useSetIndex()

  return (
    // Relative, so the screen readers' "(artan)" of a sorted column far right stays inside the scrolling area and
    // never widens the page.
    <div className="relative overflow-x-auto rounded-xl border border-line bg-pane">
      <table
        className={cn(
          'w-full border-collapse text-left text-sm',
          columns.length > PLAIN_COLUMNS.length ? 'min-w-4xl' : 'min-w-2xl',
        )}
      >
        <thead className="bg-pane-raised text-ink-muted">
          <tr>
            {columns.map((column) => {
              const isSorted = sort.key === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="px-3 py-2 font-semibold whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    title={`${column.label} sütununa göre sırala; tekrar seçince yön değişir`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded hover:text-ink',
                      isSorted && 'text-gold',
                    )}
                  >
                    {column.label}
                    <span aria-hidden="true">
                      {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                    {isSorted ? (
                      <span className="sr-only"> ({DIRECTION_LABELS[sort.direction]})</span>
                    ) : null}
                  </button>
                </th>
              )
            })}
            {onEdit ? (
              <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                İşlem
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-t border-line align-top">
              {columns.map((column) =>
                column.key === 'name' ? (
                  <th key={column.key} scope="row" className="px-3 py-2 font-semibold text-ink">
                    {linksHistory ? (
                      <Link to={cardHistoryPath(card)} className="hover:text-gold hover:underline">
                        {column.cell(card, statusText, setName)}
                      </Link>
                    ) : (
                      column.cell(card, statusText, setName)
                    )}
                    {isKnown?.(card) ? (
                      <span className={cn(ROW_MARK_CLASSES, 'border-true-word-line')}>Biliyor</span>
                    ) : null}
                    {marksHidden && !card.isInLibrary ? (
                      <span className={cn(ROW_MARK_CLASSES, 'border-ink-muted')}>
                        {DM_ONLY_MARK}
                      </span>
                    ) : null}
                  </th>
                ) : (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2 text-ink',
                      column.wide ? 'min-w-64 whitespace-pre-line' : 'whitespace-nowrap',
                    )}
                  >
                    {column.cell(card, statusText, setName)}
                  </td>
                ),
              )}
              {onEdit ? (
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <Button aria-label={`${card.name}: düzenle`} onClick={() => onEdit(card)}>
                    ✎ Düzenle
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

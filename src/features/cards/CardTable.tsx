import { Link } from 'react-router'

import { cardHistoryPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { useSetIndex } from '@/features/sets/setsContext'
import { cn } from '@/lib/cn'

import type { Deck } from './cardsContext'
import { NO_VALUE, rarityLabel, type SetName, setLabel } from './display'
import type { Card } from './schema'
import { DM_ONLY_MARK } from './status'
import type { CardSort, SortKey, StatusText } from './sort'
import { visibleText } from './text'

type Column = {
  key: SortKey
  label: string
  cell: (card: Card, statusText: StatusText, setName: SetName) => string
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

/** The columns of each deck's table, as in the legacy app. Its İşlem (edit) column shows for the DM only. */
const DECK_COLUMNS: Record<Deck, readonly SortKey[]> = {
  legend: ['name', 'set', 'cost', 'rarity', 'mechanicPack', 'text', 'status'],
  cursed: ['name', 'cost', 'text', 'status'],
}

const DIRECTION_LABELS = { asc: 'artan', desc: 'azalan' } as const

export type CardTableProps = {
  deck: Deck
  /** Already filtered and sorted. */
  cards: readonly Card[]
  sort: CardSort
  /** Called with the column the user selected. The caller decides the new direction. */
  onSort: (key: SortKey) => void
  /** The Durum text of a card. Without it, the column shows "—". */
  statusText?: StatusText
  /** For the DM: an İşlem column with each card's "✎ Düzenle". */
  onEdit?: (card: Card) => void
  /** For the DM: marks "🔒 DM" beside its name the row of a card whose "Listede görünür" is off. */
  marksHidden?: boolean
  /** In the Kart kütüphanesi and the Cursed Deck: each name links to the card's Kart geçmişi. */
  linksHistory?: boolean
}

/** The list view: one row per card. Only the table scrolls sideways at narrow widths, never the page. */
export function CardTable({
  deck,
  cards,
  sort,
  onSort,
  statusText = () => null,
  onEdit,
  marksHidden = false,
  linksHistory = false,
}: CardTableProps) {
  const columns = DECK_COLUMNS[deck].map((key) => COLUMNS[key])
  const { setName } = useSetIndex()

  return (
    // Relative, so the screen readers' "(artan)" of a sorted column far right stays inside the scrolling area and
    // never widens the page.
    <div className="relative overflow-x-auto rounded-xl border border-line bg-pane">
      <table
        className={cn(
          'w-full border-collapse text-left text-sm',
          deck === 'legend' ? 'min-w-4xl' : 'min-w-2xl',
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
                    {marksHidden && !card.isInLibrary ? (
                      <span className="ml-2 rounded-full border border-ink-muted px-1.5 py-0.5 text-xs font-normal whitespace-nowrap text-ink-muted">
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

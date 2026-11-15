import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { cardHistoryPath } from '@/app/screens'
import { cardHaystack, cardMatchesQuery, NO_VALUE, rarityLabel } from '@/features/cards/display'
import type { Rarity } from '@/features/cards/schema'
import { compareCards, type SortKey } from '@/features/cards/sort'
import { STATUS_LABELS } from '@/features/definitions/status'
import { useSetIndex } from '@/features/sets/setsContext'
import { cn } from '@/lib/cn'

import type { SetCardRow } from './setStats'

/** The columns of a set's table. */
type ColumnKey = 'name' | 'rarity' | 'cost' | 'reached' | 'used' | 'discarded' | 'packs' | 'status'
type Direction = 'asc' | 'desc'
type TableSort = { key: ColumnKey; direction: Direction }

/** The table starts with the most used cards (spec: card-stats, "The set's card table"). */
const DEFAULT_SORT: TableSort = { key: 'used', direction: 'desc' }

type Column = { key: ColumnKey; label: string; isCount: boolean }

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'Kart', isCount: false },
  { key: 'rarity', label: 'Rarity', isCount: false },
  { key: 'cost', label: 'Cost', isCount: false },
  { key: 'reached', label: 'Ele geçti', isCount: true },
  { key: 'used', label: 'Kullanıldı', isCount: true },
  { key: 'discarded', label: 'Discard', isCount: true },
  { key: 'packs', label: 'Pakette', isCount: true },
  { key: 'status', label: 'Durum', isCount: false },
]

const DIRECTION_LABELS = { asc: 'artan', desc: 'azalan' } as const

const nameOrder = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })

/** The counts a count column sorts by, the first deciding. */
function countsOf(row: SetCardRow, key: ColumnKey): number[] {
  const { stats } = row
  switch (key) {
    case 'reached':
      return [stats.reached.total]
    case 'used':
      return [stats.used]
    case 'discarded':
      return [stats.discarded]
    case 'packs':
      return [stats.shown, stats.taken]
    default:
      return []
  }
}

/** Compares two rows: counts as numbers, the other columns as the library's list does. Ties go by name. */
function compareRows(a: SetCardRow, b: SetCardRow, sort: TableSort): number {
  const column = COLUMNS.find((candidate) => candidate.key === sort.key)
  if (column?.isCount) {
    const left = countsOf(a, sort.key)
    const right = countsOf(b, sort.key)
    for (let index = 0; index < left.length; index += 1) {
      const result = (left[index] ?? 0) - (right[index] ?? 0)
      if (result !== 0) return sort.direction === 'asc' ? result : -result
    }
    return nameOrder.compare(a.card.name, b.card.name) || a.card.id.localeCompare(b.card.id)
  }
  const key: SortKey =
    sort.key === 'rarity' || sort.key === 'cost' || sort.key === 'status' ? sort.key : 'name'
  const statusOf = new Map([
    [a.card.id, a.status],
    [b.card.id, b.status],
  ])
  return compareCards(
    a.card,
    b.card,
    { key, direction: sort.direction },
    (card) => statusOf.get(card.id) ?? null,
  )
}

/** "9 / 3": the packs that showed the card and those that gave it, or "—" for a card no pack may show. */
function packsText(row: SetCardRow): string {
  const { card, stats } = row
  const isNeverInPacks = card.status === 'draft' || (!card.isInSetPacks && !card.isInMechanicPacks)
  if (isNeverInPacks && stats.shown === 0 && stats.taken === 0) return NO_VALUE
  return `${stats.shown} / ${stats.taken}`
}

const RARITY_DOTS: Readonly<Record<Rarity, string>> = { common: 'bg-common', rare: 'bg-gold' }

const fieldClasses =
  'min-w-0 rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/**
 * A set's cards with their counts (spec: card-stats, "The set's card table"; design D10). Every heading sorts, a
 * second selection reverses, and the table starts with the most used cards. A search over names and texts, as the
 * Kart kütüphanesi's, and a rarity filter narrow the table only. Each name leads to the card's Kart geçmişi. Only
 * the table scrolls sideways at narrow widths, never the page.
 */
export function SetCardTable({ rows }: { rows: readonly SetCardRow[] }) {
  const ids = useId()
  const { setName } = useSetIndex()
  const [sort, setSort] = useState<TableSort>(DEFAULT_SORT)
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState<Rarity | ''>('')

  const haystacks = useMemo(
    () => new Map(rows.map((row) => [row.card.id, cardHaystack(row.card, setName)])),
    [rows, setName],
  )
  const shown = useMemo(
    () =>
      rows
        .filter((row) => rarity === '' || row.card.rarity === rarity)
        .filter((row) => cardMatchesQuery(haystacks.get(row.card.id) ?? '', query))
        .sort((a, b) => compareRows(a, b, sort)),
    [rows, rarity, haystacks, query, sort],
  )

  const sortBy = (column: Column) =>
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: column.isCount ? 'desc' : 'asc' },
    )

  return (
    <section
      aria-label="Setin kartları"
      className="flex flex-col gap-3.5 rounded-xl border border-line bg-pane p-4"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <label htmlFor={`${ids}-search`} className="sr-only">
          Kart ara
        </label>
        <input
          id={`${ids}-search`}
          type="search"
          value={query}
          placeholder="Kart ara"
          onChange={(event) => setQuery(event.target.value)}
          className={cn(fieldClasses, 'flex-[1_1_220px]')}
        />
        <label htmlFor={`${ids}-rarity`} className="sr-only">
          Rarity
        </label>
        <select
          id={`${ids}-rarity`}
          value={rarity}
          onChange={(event) => setRarity(event.target.value as Rarity | '')}
          className={fieldClasses}
        >
          <option value="">Tüm rarity'ler</option>
          <option value="common">Common</option>
          <option value="rare">Rare</option>
        </select>
        <span className="text-[13px] text-ink-muted">{shown.length} kart</span>
      </div>

      {/* Relative, so the screen readers' "(azalan)" of a sorted column far right stays inside the scrolling area
          and never widens the page. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left text-sm">
          <thead className="text-ink-muted">
            <tr>
              {COLUMNS.map((column) => {
                const isSorted = sort.key === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    className={cn(
                      'border-b border-line px-2.5 py-2 font-semibold whitespace-nowrap',
                      column.isCount && 'text-right',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(column)}
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
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const { card, stats } = row
              return (
                <tr key={card.id} className="border-b border-line/60 align-middle last:border-b-0">
                  <th scope="row" className="px-2.5 py-2 font-semibold">
                    <Link
                      to={cardHistoryPath(card)}
                      lang="en"
                      className="text-ink hover:text-gold hover:underline"
                    >
                      {card.name}
                    </Link>
                    {row.marks.map((mark) => (
                      <span
                        key={mark}
                        className="ml-2 rounded-full border border-gold px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-gold"
                      >
                        {mark}
                      </span>
                    ))}
                  </th>
                  <td className="px-2.5 py-2 whitespace-nowrap text-ink">
                    {card.rarity === null ? (
                      NO_VALUE
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={cn('size-2 rounded-full', RARITY_DOTS[card.rarity])}
                        />
                        {rarityLabel(card)}
                      </span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-ink">{card.cost ?? NO_VALUE}</td>
                  <td className="px-2.5 py-2 text-right text-ink tabular-nums">
                    {stats.reached.total}
                  </td>
                  <td className="px-2.5 py-2 text-right font-semibold text-gold tabular-nums">
                    {stats.used}
                  </td>
                  <td className="px-2.5 py-2 text-right text-ink tabular-nums">
                    {stats.discarded}
                  </td>
                  <td className="px-2.5 py-2 text-right whitespace-nowrap text-ink-muted tabular-nums">
                    {packsText(row)}
                  </td>
                  <td
                    className={cn(
                      'px-2.5 py-2',
                      row.status === 'Havuzda'
                        ? 'text-green'
                        : row.status === STATUS_LABELS.draft || row.status === NO_VALUE
                          ? 'text-ink-muted'
                          : 'text-ink',
                    )}
                  >
                    {row.status}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 ? <p className="text-sm text-ink-muted">Aramaya uyan kart yok.</p> : null}
      <p className="text-xs text-ink-muted">
        Pakette: göründüğü pack sayısı / seçildiği. Kartın adı geçmişini açar. Bütün sütunlar
        sıralanabilir.
      </p>
    </section>
  )
}

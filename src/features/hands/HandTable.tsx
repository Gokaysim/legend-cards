import { NO_VALUE, rarityLabel, setLabel } from '@/features/cards/display'
import { visibleText } from '@/features/cards/text'
import { cn } from '@/lib/cn'

import type { HandEntry } from './handEntries'

const HEADERS = ['#', 'Kart', 'Set', 'Cost', 'Rarity', 'Mechanic Pack', 'Metin', 'Durum']

const pill = 'inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

export type HandTableProps = {
  /** In hand order. */
  entries: readonly HandEntry[]
  /** Opens a card's details. */
  onSelect: (holdingId: string) => void
}

/**
 * The hand's list view: one row per card, in the order received. The Cost column is the cost in this hand. Only
 * the table scrolls sideways at narrow widths, never the page.
 */
export function HandTable({ entries, onSelect }: HandTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-pane">
      <table className="w-full min-w-3xl border-collapse text-left text-sm">
        <thead className="bg-pane-raised text-ink-muted">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(({ holding, card, cost, isExtraCopy }, index) => (
            <tr key={holding.id} className="border-t border-line align-top">
              <td className="px-3 py-2 text-ink-muted">{index + 1}</td>
              <th scope="row" className="px-3 py-2 font-semibold text-ink">
                <button
                  type="button"
                  onClick={() => onSelect(holding.id)}
                  className="text-left underline-offset-2 hover:text-gold hover:underline"
                >
                  {card.name}
                </button>
                {holding.note ? (
                  <span className="ml-1 font-normal text-ink-muted">
                    <span aria-hidden="true">✎</span>
                    <span className="sr-only">(not var)</span>
                  </span>
                ) : null}
              </th>
              <td className="px-3 py-2 whitespace-nowrap text-ink">{setLabel(card) ?? NO_VALUE}</td>
              <td className="px-3 py-2 whitespace-nowrap text-ink">{cost ?? NO_VALUE}</td>
              <td className="px-3 py-2 whitespace-nowrap text-ink">
                {rarityLabel(card) ?? NO_VALUE}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-ink">
                {card.mechanicPack ?? NO_VALUE}
              </td>
              <td className="min-w-64 px-3 py-2 whitespace-pre-line text-ink">
                {visibleText(card.text) || NO_VALUE}
              </td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap gap-1">
                  <span
                    className={cn(
                      pill,
                      holding.active ? 'border-green text-ink' : 'border-line text-ink-muted',
                    )}
                  >
                    {holding.active ? '● Aktif' : 'Elde'}
                  </span>
                  {card.kind === 'cursed' ? (
                    <span className={cn(pill, 'border-cursed text-ink')}>☠ Cursed</span>
                  ) : null}
                  {isExtraCopy ? (
                    <span className={cn(pill, 'border-line text-ink')}>Ek kopya</span>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

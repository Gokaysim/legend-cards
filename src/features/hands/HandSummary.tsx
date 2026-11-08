import { useId } from 'react'

import { setDisplayName, setOrder } from '@/features/cards/sets'
import { compareLabels } from '@/features/cards/sort'
import { visibleText } from '@/features/cards/text'
import { cn } from '@/lib/cn'

import type { HandEntry } from './handEntries'

/** The sets of the hand's normal cards with their card counts, in shop order. Blessed and Cursed have no set. */
function handSets(entries: readonly HandEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; order: number; count: number }>()
  for (const { card } of entries) {
    if (card.kind !== 'normal') continue
    const name = setDisplayName(card.setCode)
    const current = counts.get(name)
    if (current) current.count += 1
    else counts.set(name, { name, order: setOrder(card.setCode), count: 1 })
  }
  return [...counts.values()].sort((a, b) => a.order - b.order || compareLabels(a.name, b.name))
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-pane p-3">
      <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="text-2xl font-semibold text-ink">{value}</dd>
    </div>
  )
}

/**
 * Above the hand: how many cards it holds, how many are active, from how many sets, and how many are Cursed.
 * Lists the active cards with their visible text, and the sets with their card counts.
 */
export function HandSummary({ entries }: { entries: readonly HandEntry[] }) {
  const ids = useId()
  const active = entries.filter((entry) => entry.holding.active)
  const sets = handSets(entries)
  const cursedCount = entries.filter((entry) => entry.card.kind === 'cursed').length

  return (
    <div className="flex flex-col gap-3">
      <dl aria-label="El özeti" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Eldeki kart" value={entries.length} />
        <Stat label="Aktif efekt" value={active.length} />
        <Stat label="Farklı set" value={sets.length} />
        <Stat label="☠ Cursed kart" value={cursedCount} />
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <section
          aria-labelledby={`${ids}-active`}
          className="flex flex-col gap-2 rounded-xl border border-line bg-pane p-3"
        >
          <h2 id={`${ids}-active`} className="text-sm font-semibold text-ink">
            Aktif efektler
          </h2>
          {active.length === 0 ? (
            <p className="text-sm text-ink-muted">Aktif efekt yok.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {active.map(({ holding, card }) => (
                <li
                  key={holding.id}
                  className={cn(
                    'border-l-2 pl-2 text-sm',
                    card.kind === 'cursed' ? 'border-cursed' : 'border-line',
                  )}
                >
                  <p lang="en" className="font-semibold break-words text-ink">
                    {card.kind === 'cursed' ? (
                      <>
                        <span aria-hidden="true">☠ </span>
                        <span className="sr-only">Cursed: </span>
                      </>
                    ) : null}
                    {card.name}
                  </p>
                  <p lang="en" className="break-words whitespace-pre-line text-ink-muted">
                    {visibleText(card.text) || 'Efekt metni yok.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby={`${ids}-sets`}
          className="flex flex-col gap-2 rounded-xl border border-line bg-pane p-3"
        >
          <h2 id={`${ids}-sets`} className="text-sm font-semibold text-ink">
            Setler
          </h2>
          {sets.length === 0 ? (
            <p className="text-sm text-ink-muted">Henüz set yok.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {sets.map(({ name, count }) => (
                <li key={name} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words text-ink">{name}</span>
                  <span className="shrink-0 text-ink-muted">{count} kart</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

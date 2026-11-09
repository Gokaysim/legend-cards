import { type ReactNode, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { BalanceDialog } from '@/features/balances/BalanceDialog'
import { formatAmount } from '@/features/balances/format'
import { setDisplayName, setOrder } from '@/features/cards/sets'
import { compareLabels } from '@/features/cards/sort'
import { visibleText } from '@/features/cards/text'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import { DmOnly } from '@/features/users/DmOnly'
import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { genitive } from '@/lib/turkish'

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

function Stat({
  label,
  value,
  action,
  className,
}: {
  label: string
  value: ReactNode
  /** A control next to the value, outside the `dd`, so the value reads on its own. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border border-line bg-pane p-3', className)}>
      <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <div className="flex items-center justify-between gap-2">
        <dd className="text-2xl font-semibold text-ink tabular-nums">{value}</dd>
        {action}
      </div>
    </div>
  )
}

/**
 * Above the hand: a player's Legend Points (the DM changes them here; the DM has none), how many cards the hand
 * holds, how many are active, from how many sets, and how many are Cursed. Lists the active cards with their
 * visible text, and the sets with their card counts.
 */
export function HandSummary({
  entries,
  profile,
}: {
  entries: readonly HandEntry[]
  /** Whose hand this is, live. */
  profile: UserProfile
}) {
  const ids = useId()
  const [isChangingLp, setIsChangingLp] = useState(false)
  const isTableBusy = useIsTableBusy()
  const isPlayer = profile.role === 'player'
  const playerName = profileName(profile)
  const active = entries.filter((entry) => entry.holding.active)
  const sets = handSets(entries)
  const cursedCount = entries.filter((entry) => entry.card.kind === 'cursed').length

  return (
    <div className="flex flex-col gap-3">
      <dl
        aria-label="El özeti"
        className={cn('grid grid-cols-2 gap-2', isPlayer ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}
      >
        {isPlayer ? (
          <Stat
            label="Legend Point"
            value={formatAmount(profile.lp)}
            className="col-span-2 sm:col-span-1"
            action={
              <DmOnly>
                <Button
                  variant="ghost"
                  className="shrink-0 px-2 py-1"
                  aria-label={`${genitive(playerName)} LP'sini değiştir`}
                  disabled={isTableBusy}
                  title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                  onClick={() => setIsChangingLp(true)}
                >
                  ± LP
                </Button>
              </DmOnly>
            }
          />
        ) : null}
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
      {isChangingLp ? (
        <BalanceDialog
          currency="lp"
          uid={profile.id}
          name={playerName}
          balance={profile.lp}
          onClose={() => setIsChangingLp(false)}
        />
      ) : null}
    </div>
  )
}

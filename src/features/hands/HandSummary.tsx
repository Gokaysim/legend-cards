import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { PopoverTrigger } from '@/components/ui/PopoverTrigger'
import { useAuth } from '@/features/auth/authContext'
import { BalanceDialog } from '@/features/balances/BalanceDialog'
import { formatAmount } from '@/features/balances/format'
import { compareLabels } from '@/features/cards/sort'
import type { SetIndex } from '@/features/sets/index'
import { useSetIndex } from '@/features/sets/setsContext'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import type { KnownWordEntry } from '@/features/true-words/trueWordsContext'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { usePopover } from '@/lib/usePopover'

import type { HandEntry } from './handEntries'
import { StatTile } from './StatTile'

/** The sets of the hand's normal cards with their card counts, in the stored order. Blessed and Cursed have no set. */
function handSets(
  entries: readonly HandEntry[],
  sets: SetIndex,
): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; order: number; count: number }>()
  for (const { card } of entries) {
    // A held card is active or retired, so a normal one has a set; the check is for the types.
    if (card.kind !== 'normal' || card.setCode === null) continue
    const name = sets.setName(card.setCode)
    const current = counts.get(name)
    if (current) current.count += 1
    else counts.set(name, { name, order: sets.setRank(card.setCode), count: 1 })
  }
  return [...counts.values()].sort((a, b) => a.order - b.order || compareLabels(a.name, b.name))
}

/**
 * The strip above the hand (spec: card-holdings, "Hand summary"; design D1 of redesign-hand-dashboard), three stats in
 * one row on every width: the user's Legend Points (the DM changes them here with "± LP", the player spends their own
 * with "− LP"), how many cards the hand holds, and how many of them are Cursed beside how many True Words the player
 * knows. True Words are not cards.
 *
 * "Kartlar ⓘ" opens the hand's sets with their card counts. The list opens while a mouse or pen rests on the stat,
 * while the stat has the focus from the keyboard, and after a tap until the next tap, a press elsewhere, or Escape. It
 * lies under the strip, so it never widens the page. Closed, it is `sr-only`: screen readers and search still read it.
 */
export function HandSummary({
  entries,
  words,
  profile,
}: {
  entries: readonly HandEntry[]
  /** The player's known True Words, in the order learned. */
  words: readonly KnownWordEntry[]
  /** Whose hand this is, live. */
  profile: UserProfile
}) {
  const ids = useId()
  const auth = useAuth()
  const isOwnHand = auth.status === 'signedIn' && auth.user.uid === profile.id
  /** The open LP dialog: the DM's change, or the player's own spend. */
  const [lpDialog, setLpDialog] = useState<'change' | 'spend' | null>(null)
  const setsList = usePopover()
  const isTableBusy = useIsTableBusy()
  const setIndex = useSetIndex()
  const isDm = useIsDm()
  const playerName = profileName(profile)
  const sets = handSets(entries, setIndex)
  const cursedCount = entries.filter((entry) => entry.card.kind === 'cursed').length
  const listId = `${ids}-sets`

  return (
    <div className="relative min-w-0">
      <dl
        aria-label="El özeti"
        className="grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-pane"
      >
        {/* Every hand shows LP, a DM's too (spec: balances, "LP on the hand screen"): the DM changes any hand's LP,
            their own included, and a player spends their own. */}
        <StatTile
          // English, as the game term is: a Turkish capital would dot its "i" ("POİNT").
          label={<span lang="en">Legend Point</span>}
          value={formatAmount(profile.lp)}
          action={
            isDm ? (
              <Button
                variant="ghost"
                className="shrink-0 px-2 py-1"
                aria-label={`${genitive(playerName)} LP'sini değiştir`}
                disabled={isTableBusy}
                title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                onClick={() => setLpDialog('change')}
              >
                ± LP
              </Button>
            ) : isOwnHand ? (
              // The player's own spend (spec: balances, "A player lowers their own LP").
              <Button
                variant="ghost"
                className="shrink-0 px-2 py-1"
                disabled={isTableBusy || profile.lp <= 0}
                title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                onClick={() => setLpDialog('spend')}
              >
                − LP
              </Button>
            ) : null
          }
        />
        <StatTile
          label="Kartlar"
          value={entries.length}
          hasInfo
          className="border-l border-line"
          cover={
            <PopoverTrigger
              state={setsList}
              tap="toggle"
              aria-label="Eldeki setler"
              aria-controls={listId}
              className="absolute inset-0 cursor-help focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
            />
          }
        />
        <StatTile
          label={
            <>
              Cursed <span aria-hidden="true">·</span>{' '}
              <abbr title="True Words" className="no-underline">
                TW
              </abbr>
            </>
          }
          tone="cursed-word"
          className="border-l border-line"
          value={
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-stat-cursed-ink text-shadow-glow-cursed">
                <span aria-hidden="true">☠ </span>
                <span className="sr-only">Cursed kart: </span>
                {cursedCount}
              </span>
              <span className="text-true-word text-shadow-glow-word">
                <span aria-hidden="true">✦ </span>
                <span className="sr-only">True Words: </span>
                {words.length}
              </span>
            </span>
          }
        />
      </dl>
      <section
        id={listId}
        aria-labelledby={`${listId}-title`}
        data-open={setsList.isOpen || undefined}
        className={
          setsList.isOpen
            ? 'pointer-events-none absolute inset-x-0 top-full z-40 mt-2 flex max-w-xl flex-col gap-2 rounded-xl border border-gold/60 bg-sidebar p-3 shadow-lg sm:right-auto sm:left-1/3 sm:w-80'
            : 'sr-only'
        }
      >
        <h2 id={`${listId}-title`} className="text-sm font-semibold text-gold">
          {`Eldeki setler · ${sets.length} set`}
        </h2>
        {sets.length === 0 ? (
          <p className="text-sm text-ink-muted">Henüz set yok.</p>
        ) : (
          <ul className="flex flex-col text-sm">
            {sets.map(({ name, count }) => (
              <li
                key={name}
                className="flex items-baseline justify-between gap-3 border-t border-line py-1 first:border-t-0"
              >
                <span className="min-w-0 break-words text-ink">{name}</span>
                <span className="shrink-0 font-semibold whitespace-nowrap text-gold">
                  {count} kart
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {lpDialog !== null ? (
        <BalanceDialog
          currency="lp"
          uid={profile.id}
          name={playerName}
          isSpend={lpDialog === 'spend'}
          balance={profile.lp}
          onClose={() => setLpDialog(null)}
        />
      ) : null}
    </div>
  )
}

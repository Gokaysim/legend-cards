import { Avatar } from '@/components/ui/Avatar'
import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/days'

import { isPendingRoll } from './diceContext'
import { FlatDice, NaturalMarkLabel } from './FlatDice'
import { rollView } from './rollView'
import type { DiceRoll } from './schema'

export type RollEntryProps = {
  roll: DiceRoll
  /** The roller's profile, when loaded. */
  roller: UserProfile | undefined
  /** Plays the roll's throw again in the strip; writes nothing. */
  onReplay: (roll: DiceRoll) => void
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-3.5"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

/**
 * One roll in the channel (spec: dice-rolls, "The channel"): who rolled and when, the note, the formula, each die with
 * its result, the total and the natural marks, and "Tekrar izle". A hidden roll shows to a player as "DM gizli zar
 * attı" and to the DM in full, marked hidden. A roll still waiting to be sent says so.
 */
export function RollEntry({ roll, roller, onReplay }: RollEntryProps) {
  const name = roller ? profileName(roller) : 'Bilinmeyen oyuncu'
  const isPending = isPendingRoll(roll)
  const content = roll.content
  const view = content ? rollView(content) : null

  return (
    <li
      aria-label={`${name} atışı`}
      data-pending={isPending}
      className="flex gap-3 rounded-lg px-2 py-2.5"
    >
      <Avatar name={name} photoURL={roller?.photoURL ?? null} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <strong className="text-ink">{name}</strong>
          {roll.at ? (
            <time dateTime={roll.at.toDate().toISOString()} className="text-xs text-ink-muted">
              {formatTime(roll.at.toDate())}
            </time>
          ) : null}
          {isPending ? <span className="text-xs text-ink-muted">gönderiliyor</span> : null}
          {roll.hidden && content ? (
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <LockIcon />
              Gizli
            </span>
          ) : null}
          {content ? (
            <button
              type="button"
              onClick={() => onReplay(roll)}
              className="text-xs text-gold underline-offset-2 hover:underline"
            >
              Tekrar izle
            </button>
          ) : null}
        </div>

        {content && view ? (
          <>
            {content.note ? <p className="mt-0.5 text-sm text-ink">{content.note}</p> : null}
            <div
              className={cn(
                'mt-1.5 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-pane px-3 py-2',
                view.mark === 'natural20' && 'border-gold',
                view.mark === 'natural1' && 'border-cursed',
              )}
            >
              <span className="mr-1 text-sm text-ink-muted">{view.formula}</span>
              <FlatDice view={view} style={content.style} />
              {content.modifier !== 0 ? (
                <span className="text-sm text-ink-muted">
                  {content.modifier > 0 ? `+${content.modifier}` : `−${Math.abs(content.modifier)}`}
                </span>
              ) : null}
              <NaturalMarkLabel view={view} className="ml-1" />
              <span className="ml-2 text-2xl font-extrabold text-gold">
                <span className="sr-only">Toplam: </span>
                {view.total}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-1.5 inline-flex items-center gap-2 rounded-xl border border-dashed border-line bg-pane px-3 py-2 text-sm text-ink-muted">
            <LockIcon />
            DM gizli zar attı
          </p>
        )}
      </div>
    </li>
  )
}

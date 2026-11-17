import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * A stat's colors (spec: visual-effects, "The hand's stat colors"; design D1 of redesign-hand-dashboard): gold on the
 * strip's own surface, or the Cursed and True Words stat, whose surface runs from dark red to dark purple.
 */
export type StatTone = 'plain' | 'cursed-word'

const TONES: Record<StatTone, { tile: string; label: string; value: string }> = {
  plain: { tile: '', label: 'text-ink-muted', value: 'text-gold' },
  'cursed-word': {
    tile: 'bg-linear-90 from-stat-cursed to-stat-word-deep',
    label: 'text-cursed-soft',
    value: '',
  },
}

export type StatTileProps = {
  label: ReactNode
  value: ReactNode
  tone?: StatTone
  /** Marks the label with "ⓘ": the stat opens a list. */
  hasInfo?: boolean
  /** A control next to the value, outside the `dd`, so the value reads on its own. It lies above `cover`. */
  action?: ReactNode
  /** A control that covers the whole stat, for example the button that opens its list. */
  cover?: ReactNode
  className?: string
}

/**
 * One section of the strip above the hand, as a `dt` and a `dd` inside the summary's `<dl>` (design D1 of
 * redesign-hand-dashboard): its label, small and in capitals, over its value on a phone, and beside it from 640 px.
 */
export function StatTile({
  label,
  value,
  tone = 'plain',
  hasInfo = false,
  action,
  cover,
  className,
}: StatTileProps) {
  const colors = TONES[tone]
  return (
    <div
      data-tone={tone}
      className={cn(
        'relative flex min-w-0 flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5',
        colors.tile,
        className,
      )}
    >
      <dt className={cn('text-xs font-semibold tracking-wide break-words uppercase', colors.label)}>
        {label}
        {hasInfo ? (
          <span aria-hidden="true" className="text-gold">
            {' ⓘ'}
          </span>
        ) : null}
      </dt>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <dd className={cn('text-xl font-semibold tabular-nums sm:text-2xl', colors.value)}>
          {value}
        </dd>
        {action ? <div className="relative z-1">{action}</div> : null}
      </div>
      {cover}
    </div>
  )
}

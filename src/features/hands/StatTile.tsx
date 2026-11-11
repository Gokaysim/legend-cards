import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** A stat tile's colors (spec: visual-effects, "The hand's stat colors"; design D7). */
export type StatTone = 'plain' | 'cursed' | 'word'

const TONES: Record<StatTone, { tile: string; label: string; value: string }> = {
  plain: { tile: 'border-line bg-pane-raised', label: 'text-ink-muted', value: 'text-gold' },
  cursed: {
    tile: 'border-stat-cursed-line bg-linear-140 from-stat-cursed to-stat-cursed-deep',
    label: 'text-cursed-soft',
    value: 'text-stat-cursed-ink text-shadow-glow-cursed',
  },
  word: {
    tile: 'border-true-word-line bg-linear-145 from-stat-word to-stat-word-deep',
    label: 'text-ink-muted',
    value: 'text-true-word',
  },
}

export type StatTileProps = {
  label: string
  value: ReactNode
  tone?: StatTone
  /** Marks the label with "ⓘ": the tile opens a list (design D6). */
  hasInfo?: boolean
  /** A control next to the value, outside the `dd`, so the value reads on its own. It lies above `cover`. */
  action?: ReactNode
  /** A control that covers the whole tile, for example the button that opens its list. */
  cover?: ReactNode
  className?: string
}

/**
 * One stat above the hand, as a `dt` and a `dd` inside the summary's `<dl>`: its label, small and in capitals, and its
 * value, large, in its tone's color (v2.2.8's `.stat`, `.stat-cursed` and `.stat-truewords`).
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
        'relative flex min-w-0 flex-col gap-1 rounded-xl border px-3 py-2.5',
        colors.tile,
        className,
      )}
    >
      <dt className={cn('text-xs font-semibold tracking-wide uppercase', colors.label)}>
        {label}
        {hasInfo ? (
          <span aria-hidden="true" className="text-gold">
            {' ⓘ'}
          </span>
        ) : null}
      </dt>
      <div className="flex items-center justify-between gap-2">
        <dd className={cn('text-2xl font-semibold tabular-nums', colors.value)}>{value}</dd>
        {action ? <div className="relative z-1">{action}</div> : null}
      </div>
      {cover}
    </div>
  )
}

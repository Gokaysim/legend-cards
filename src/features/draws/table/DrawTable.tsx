import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** The table's tint: the usual one, or deep red for a Cursed draw (spec: visual-effects, "A Cursed table"). */
export type DrawTableTone = 'neutral' | 'cursed'

const TONES: Record<DrawTableTone, string> = {
  neutral:
    'bg-[radial-gradient(80%_120%_at_30%_50%,var(--color-pane-raised),var(--color-canvas)_75%)]',
  cursed:
    'bg-[radial-gradient(80%_120%_at_30%_50%,var(--color-stat-cursed-deep),var(--color-canvas)_75%)]',
}

export type DrawTableProps = {
  tone?: DrawTableTone
  /** The source on the left: the deck with its control, or the opened pack. */
  source: ReactNode
  /** The cards beside it: a heading and the spread. */
  children: ReactNode
}

/**
 * The draw table that the draw dialog, the watching view and the open pack share (design D7 of live-draws, V1 ·
 * Masa): the source on the left and the cards beside it from 640 px, under it below.
 */
export function DrawTable({ tone = 'neutral', source, children }: DrawTableProps) {
  return (
    <div
      data-testid="draw-table"
      data-tone={tone}
      className={cn(
        'flex flex-col items-center gap-6 rounded-2xl border border-line p-4 sm:flex-row sm:items-start sm:p-6',
        TONES[tone],
      )}
    >
      <div className="flex w-40 shrink-0 flex-col items-center gap-3 sm:w-44">{source}</div>
      <div className="flex w-full min-w-0 flex-col gap-3">{children}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { LiveMark } from './LiveMark'

/**
 * How a chip above the draw table looks (design D7 of live-draws):
 * - `plain`: a fact, such as the hand or the price
 * - `gold`: the player's LP
 * - `live`: "Canlı", with the live mark
 * - `waiting`: "Masa bekliyor" while a pack is open
 * - `cursed`: a Cursed draw
 * - `mode`: the table's player draw mode in a player's draw (spec: card-draws, "The mode in a player's dialog")
 */
export type TableChipVariant = 'plain' | 'gold' | 'live' | 'waiting' | 'cursed' | 'mode'

const VARIANTS: Record<TableChipVariant, string> = {
  plain: 'border-line text-ink-muted',
  gold: 'border-gold font-semibold text-gold',
  live: 'border-green/40 font-semibold text-green',
  waiting: 'border-primary-line text-gold',
  cursed: 'border-stat-cursed-line text-cursed-soft',
  mode: 'border-primary-line font-semibold text-gold',
}

/** One chip above the draw table: the kind of draw or the pack, the hand, the payment, live or waiting. */
export function TableChip({
  variant = 'plain',
  children,
}: {
  variant?: TableChipVariant
  children: ReactNode
}) {
  return (
    <li
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap',
        VARIANTS[variant],
      )}
    >
      {variant === 'live' ? <LiveMark /> : null}
      {children}
    </li>
  )
}

/** The row of chips above the draw table. */
export function TableChips({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex flex-wrap items-center gap-2">
      {children}
    </ul>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Each card's slight turn in the fan, by its place. Only with motion: with reduced motion the cards lie straight
 * (spec: visual-effects, "The draw spread").
 */
const FAN_TILTS = [
  'motion-safe:-rotate-3',
  'motion-safe:rotate-1',
  'motion-safe:-rotate-1',
  'motion-safe:rotate-3',
]

/**
 * How large the cards lie: `draw` about half as large again as a hand card, for a draw's cards; `pack` smaller, so the
 * 5 or 6 cards of a pack fit beside it.
 */
export type DrawSpreadSize = 'draw' | 'pack'

const SIZES: Record<DrawSpreadSize, string> = {
  draw: 'w-[clamp(202.5px,51vw,277.5px)] max-w-[calc(100vw-84px)] sm:w-[clamp(210px,24vw,300px)]',
  pack: 'w-[clamp(140px,40vw,190px)] max-w-[calc(50vw-40px)] sm:w-[clamp(100px,10vw,122px)] sm:max-w-none',
}

export type DrawSpreadProps<T> = {
  items: readonly T[]
  itemKey: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  size?: DrawSpreadSize
  /** The list's accessible name, for example "Pack kartları". */
  label?: string
}

/**
 * The fan of cards on the draw table (spec: visual-effects, "The draw spread"): slightly turned, overlapping cards that
 * wrap to fit; the card under the pointer or the focus lifts and comes to the front. The right padding makes up for the
 * overlap.
 */
export function DrawSpread<T>({
  items,
  itemKey,
  renderItem,
  size = 'draw',
  label,
}: DrawSpreadProps<T>) {
  return (
    <ol
      aria-label={label}
      className="flex flex-wrap justify-center gap-y-4 pt-3 pr-3 pb-1 sm:justify-start sm:pr-3.75"
    >
      {items.map((item, index) => (
        <li
          key={itemKey(item)}
          className={cn(
            'relative z-1 -mr-3 transition duration-200 focus-within:z-50 hover:z-50 motion-safe:focus-within:-translate-y-2.5 motion-safe:focus-within:scale-[1.035] motion-safe:hover:-translate-y-2.5 motion-safe:hover:scale-[1.035] sm:-mr-3.75',
            SIZES[size],
            FAN_TILTS[index % FAN_TILTS.length],
          )}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </ol>
  )
}

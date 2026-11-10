import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { type DeckOptions, useDeckLayout } from './useDeckLayout'

/**
 * The two decks (design D6): cards up to 235 px wide, the hand overlapping by up to 36% of a card and the library by
 * up to 39%, as in v2.2.8, and every few cards at a slight angle that is the same on every device.
 */
const DECKS = {
  hand: {
    options: { preferredWidth: 235, maxOverlapRatio: 0.36, gap: 12 },
    angles:
      'motion-safe:nth-[5n+2]:rotate-[-0.35deg] motion-safe:nth-[5n+3]:rotate-[0.45deg] motion-safe:nth-[5n+4]:rotate-[-0.2deg]',
  },
  library: {
    options: { preferredWidth: 235, maxOverlapRatio: 0.39, gap: 12 },
    angles:
      'motion-safe:nth-[7n+2]:rotate-[-0.3deg] motion-safe:nth-[7n+4]:rotate-[0.4deg] motion-safe:nth-[7n+6]:rotate-[-0.25deg]',
  },
} as const satisfies Record<string, { options: DeckOptions; angles: string }>

export type CardDeckProps<T> = {
  /** `ol` for a list in a meaningful order, such as a hand. */
  as: 'ol' | 'ul'
  label: string
  deck: keyof typeof DECKS
  items: readonly T[]
  itemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/**
 * Card faces laid out as a physical deck (spec: visual-effects): they overlap a little when that fits more of them
 * into a row, and the card under the pointer or the focus comes to the front whole. Without hover, they never overlap.
 * With reduced motion, they sit straight.
 */
export function CardDeck<T>({
  as: List,
  label,
  deck,
  items,
  itemKey,
  renderItem,
}: CardDeckProps<T>) {
  const { options, angles } = DECKS[deck]
  const { ref, listStyle, itemStyle } = useDeckLayout(items.length, options)
  return (
    <List
      ref={ref}
      aria-label={label}
      data-deck={deck}
      style={listStyle}
      className="flex flex-wrap gap-y-4"
    >
      {items.map((item, index) => (
        <li
          key={itemKey(item)}
          style={itemStyle(index)}
          className={cn(
            'relative z-(--deck-z) w-(--deck-card-width) max-w-full focus-within:z-30 hover:z-30',
            angles,
          )}
        >
          {renderItem(item)}
        </li>
      ))}
    </List>
  )
}

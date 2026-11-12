import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** A border in a kind's color: a card's frame (`common`, `rare`, `blessed`, `cursed`) or a True Word's. */
export type PillTone = 'common' | 'rare' | 'blessed' | 'cursed' | 'true-word'

/** Only the border takes the kind's color, so every text pair stays inside the tested tokens (design D2). */
const TONE_BORDERS: Record<PillTone, string> = {
  common: 'border-common',
  rare: 'border-gold',
  blessed: 'border-blessed',
  cursed: 'border-cursed',
  'true-word': 'border-true-word-line',
}

export type PillProps = {
  /** The border's kind color, or the plain line without one. */
  tone?: PillTone
  /** Muted text, for a secondary label such as the mechanic pack. */
  isMuted?: boolean
  children: ReactNode
}

/**
 * A small rounded label, as under the face in the card's or word's details (spec: card-holdings, "The card's face and
 * labels in the details"; design D2 of `redesign-selected-card-panel`).
 */
export function Pill({ tone, isMuted = false, children }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border bg-pane-raised px-2.5 py-1 text-xs font-medium break-words',
        tone ? TONE_BORDERS[tone] : 'border-line',
        isMuted ? 'text-ink-muted' : 'text-ink',
      )}
    >
      {children}
    </span>
  )
}

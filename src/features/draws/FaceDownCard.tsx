import { useEffect, useRef, useState } from 'react'

import { CardFace } from '@/features/cards/CardFace'
import type { Card } from '@/features/cards/schema'
import { cn } from '@/lib/cn'

/** The back's look: the same for every random draw, so it never gives a Blessed card away. */
export type CardBackTone = 'random' | 'cursed'

const BACK_CLASSES: Record<CardBackTone, string> = {
  random: 'border-gold from-control via-pane-raised to-primary',
  cursed: 'border-cursed from-control via-pane-raised to-cursed/40',
}

const BACK_GLYPH: Record<CardBackTone, string> = { random: '✦', cursed: '☠' }

export type FaceDownCardProps = {
  card: Card
  /** The card's place in the spread, from 1. */
  position: number
  tone: CardBackTone
}

/**
 * A drawn card, face down until it is selected. The back is drawn with CSS (the cardbacks come with card
 * pictures) and tells nothing about the card: the face is not rendered before the turn. Selecting it turns it
 * over to its face, which then stays revealed; under `prefers-reduced-motion` it switches without the turn.
 */
export function FaceDownCard({ card, position, tone }: FaceDownCardProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const faceRef = useRef<HTMLDivElement>(null)

  // The back leaves the focus order when it turns, so the focus moves to the face.
  useEffect(() => {
    if (isRevealed) faceRef.current?.focus()
  }, [isRevealed])

  return (
    <div className="perspective-distant">
      <div
        className={cn(
          'grid transition-transform duration-500 transform-3d motion-reduce:transition-none',
          isRevealed && 'rotate-y-180',
        )}
      >
        <button
          type="button"
          aria-label={`Kart ${position}: çevir`}
          disabled={isRevealed}
          inert={isRevealed}
          onClick={() => setIsRevealed(true)}
          className={cn(
            'col-start-1 row-start-1 flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 bg-linear-to-br p-3 backface-hidden',
            BACK_CLASSES[tone],
          )}
        >
          <span
            aria-hidden="true"
            className={cn('text-4xl', tone === 'cursed' ? 'text-cursed' : 'text-gold')}
          >
            {BACK_GLYPH[tone]}
          </span>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink">
            Çevir
          </span>
        </button>
        {isRevealed ? (
          <div
            ref={faceRef}
            tabIndex={-1}
            aria-label={`Kart ${position}`}
            role="group"
            className="col-start-1 row-start-1 rotate-y-180 rounded-xl backface-hidden"
          >
            <CardFace card={card} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

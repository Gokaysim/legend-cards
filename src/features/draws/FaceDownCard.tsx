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
  /**
   * Controlled mode: whether the card is face up, for a card whose state lives elsewhere (an open pack, turned on
   * any device). Without it, the card keeps its own state.
   */
  isRevealed?: boolean
  /** Controlled mode: called when the back is selected. */
  onReveal?: () => void
  /** `false` shows the back without a control, for someone who only watches. */
  canTurn?: boolean
}

/**
 * A drawn card, face down until it is selected. The back is drawn with CSS (the cardbacks come with card
 * pictures) and tells nothing about the card: the face is not rendered before the turn. Selecting it turns it
 * over to its face, which then stays revealed; under `prefers-reduced-motion` it switches without the turn.
 */
export function FaceDownCard({
  card,
  position,
  tone,
  isRevealed: revealedFromProps,
  onReveal,
  canTurn = true,
}: FaceDownCardProps) {
  const [revealedHere, setRevealedHere] = useState(false)
  const isRevealed = revealedFromProps ?? revealedHere
  const turnedHere = useRef(false)
  const faceRef = useRef<HTMLDivElement>(null)

  // The back leaves the focus order when it turns, so the focus moves to the face. Only for a turn made here: a
  // card turned on another device never takes the focus.
  useEffect(() => {
    if (isRevealed && turnedHere.current) faceRef.current?.focus()
  }, [isRevealed])

  const turn = () => {
    turnedHere.current = true
    if (onReveal) onReveal()
    else setRevealedHere(true)
  }
  const backClasses = cn(
    'col-start-1 row-start-1 flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 bg-linear-to-br p-3 backface-hidden',
    BACK_CLASSES[tone],
  )
  const backContent = (
    <>
      <span
        aria-hidden="true"
        className={cn('text-4xl', tone === 'cursed' ? 'text-cursed' : 'text-gold')}
      >
        {BACK_GLYPH[tone]}
      </span>
      {canTurn ? (
        <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink">
          Çevir
        </span>
      ) : null}
    </>
  )

  return (
    <div className="perspective-distant">
      <div
        className={cn(
          'grid transition-transform duration-500 transform-3d motion-reduce:transition-none',
          isRevealed && 'rotate-y-180',
        )}
      >
        {canTurn ? (
          <button
            type="button"
            aria-label={`Kart ${position}: çevir`}
            disabled={isRevealed}
            inert={isRevealed}
            onClick={turn}
            className={backClasses}
          >
            {backContent}
          </button>
        ) : (
          <div
            role="img"
            aria-label={`Kart ${position}: kapalı`}
            aria-hidden={isRevealed}
            className={backClasses}
          >
            {backContent}
          </div>
        )}
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

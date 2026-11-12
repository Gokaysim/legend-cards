import { useEffect, useRef, useState } from 'react'

import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { type SpreadBack, spreadBackUrl } from '@/features/art/spreadBack'
import { CSS_BACK_SHAPE, CSS_BACK_TONES, type CssBackTone } from '@/features/art/cssBack'
import { CssBackGlyph } from '@/features/art/NeutralCardBack'
import { usePicture } from '@/features/art/usePicture'
import { CardFace } from '@/features/cards/CardFace'
import type { Card } from '@/features/cards/schema'
import { cn } from '@/lib/cn'

export type FaceDownCardProps = {
  card: Card
  /** The card's place in the spread, from 1. */
  position: number
  /** The spread's back, the same for each of its cards: it never depends on the card. */
  back: SpreadBack
  /**
   * Controlled mode: whether the card is face up, for a card whose state lives elsewhere (an open pack, turned on
   * any device). Without it, the card keeps its own state.
   */
  isRevealed?: boolean
  /** Controlled mode: called when the back is selected. */
  onReveal?: () => void
  /** `false` shows the back without a control, for someone who only watches. */
  canTurn?: boolean
  /** Called when the card is turned over here, in either mode. */
  onTurn?: () => void
}

/**
 * A drawn card, face down until it is selected. The back is the spread's cardback picture, or the CSS back without
 * one, and tells nothing about the card: the face is not rendered before the turn, and the back never glows. Selecting
 * it turns it over to its face, which then stays revealed and glows in its kind's color; under
 * `prefers-reduced-motion` it switches without the turn.
 */
export function FaceDownCard({
  card,
  position,
  back,
  isRevealed: revealedFromProps,
  onReveal,
  canTurn = true,
  onTurn,
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
    onTurn?.()
  }
  const picture = usePicture(spreadBackUrl(useArt(), back))
  const tone: CssBackTone = back.kind === 'cursed' ? 'cursed' : 'neutral'
  const turnLabel = (className?: string) =>
    canTurn ? (
      <span
        className={cn('rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink', className)}
      >
        Çevir
      </span>
    ) : null

  // The back without a picture has a card's shape, as the picture does, at any width of the spread.
  const backClasses = cn(
    'col-start-1 row-start-1 rounded-xl border-2 backface-hidden',
    picture.src === null
      ? cn(CSS_BACK_SHAPE, CSS_BACK_TONES[tone])
      : 'relative block overflow-hidden border-transparent',
  )
  const backContent =
    picture.src === null ? (
      <>
        <CssBackGlyph tone={tone} />
        {turnLabel()}
      </>
    ) : (
      <>
        <CardPicture
          src={picture.src}
          alt=""
          onError={picture.onError}
          className="h-full rounded-none"
        />
        {turnLabel('absolute bottom-2 left-1/2 -translate-x-1/2 shadow-md')}
      </>
    )

  return (
    <div className="perspective-distant">
      <div
        className={cn(
          'grid transition-transform duration-680 ease-card-flip transform-3d motion-reduce:transition-none',
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
            // The lift shadow under the face; the face glows in its kind's color inside it (design D2).
            className="col-start-1 row-start-1 rotate-y-180 rounded-xl drop-shadow-lift backface-hidden"
          >
            <CardFace card={card} isRevealed />
          </div>
        ) : null}
      </div>
    </div>
  )
}

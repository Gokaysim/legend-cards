import { type ReactNode, useId, useState } from 'react'

import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

import { type CardFrame, cardFrame, costChange, NO_VALUE, rarityLabel, setLabel } from './display'
import type { Card } from './schema'
import { visibleText } from './text'

const FRAME_CLASSES: Record<CardFrame, string> = {
  common: 'border-common',
  rare: 'border-gold',
  blessed: 'border-blessed',
  cursed: 'border-cursed',
}

const COST_CHANGE = {
  lower: { className: 'border-green text-green', label: 'bu elde daha düşük' },
  higher: { className: 'border-cursed text-cursed', label: 'bu elde daha yüksek' },
} as const

/** A small label on the face, for example "Aktif". */
function Mark({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

export type CardFaceProps = {
  card: Card
  /**
   * For a card in a hand: its cost there, the cost override or the card's own cost. When both costs are numbers
   * and differ, the cost is marked lower (green) or higher (red).
   */
  handCost?: string | null
  /** For a card in a hand: it is switched active. Marked in the frame's color. */
  isActive?: boolean
  /** For a card in a hand: it has a note. */
  hasNote?: boolean
  /** For a card in a hand: an extra copy given by the DM, not the copy that holds the card. */
  isExtraCopy?: boolean
  /** In the library: the names of the players holding it, for a held normal card or a Cursed card in hands. */
  heldBy?: readonly string[]
}

/**
 * One card shown as a card face, in its kind's frame color. With the card's picture (design D6), the picture carries
 * the cost, name and text, which stay in the DOM for screen readers and search; a hand cost that differs from the
 * card's own cost is a badge on the picture's cost corner. Nothing is written under the picture: the set, rarity and
 * mechanic pack show in a note while the pointer rests on the picture's set symbol, or after a tap on it. Without a
 * picture, or when it fails to load, the face draws the cost, name and visible text itself, with the set, rarity and
 * mechanic pack below. Cursed cards have none of those three. A card in a hand shows its marks; a held card in the
 * library shows who holds it.
 */
export function CardFace({
  card,
  handCost,
  isActive = false,
  hasNote = false,
  isExtraCopy = false,
  heldBy,
}: CardFaceProps) {
  const picture = usePicture(useArt().cardUrl(card.id))
  const infoId = useId()
  // A tap shows the set symbol's note until the symbol loses the focus; a pointer resting on it shows it too (CSS).
  const [isInfoShown, setIsInfoShown] = useState(false)
  const frame = cardFrame(card)
  const isInHand = handCost !== undefined
  const cost = (isInHand ? handCost : card.cost) ?? NO_VALUE
  const change = isInHand ? costChange(card.cost, handCost) : null
  const text = visibleText(card.text)
  const hasMarks = isActive || hasNote || isExtraCopy || heldBy !== undefined

  const costBadge = (className: string) => (
    <span
      title={change ? `Cost: ${cost} (temel cost: ${card.cost ?? NO_VALUE})` : `Cost: ${cost}`}
      data-cost-change={change ?? undefined}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink',
        change && COST_CHANGE[change].className,
        className,
      )}
    >
      <span className="sr-only">Cost: </span>
      {cost}
      {change ? (
        <span className="sr-only">
          {` (${COST_CHANGE[change].label}; temel cost: ${card.cost ?? NO_VALUE})`}
        </span>
      ) : null}
    </span>
  )
  // Card names and texts are English: hyphenate them as English on narrow faces.
  const name = (className?: string) => (
    <h3
      lang="en"
      className={cn(
        'min-w-0 text-sm leading-snug font-semibold break-words hyphens-auto text-ink',
        className,
      )}
    >
      {card.name}
    </h3>
  )
  const body = (className?: string) => (
    <p
      lang="en"
      className={cn(
        'flex-1 text-sm leading-snug break-words hyphens-auto whitespace-pre-line text-ink',
        className,
      )}
    >
      {text || NO_VALUE}
    </p>
  )
  const marks = hasMarks ? (
    <div className="flex flex-wrap gap-1">
      {isActive ? <Mark className={FRAME_CLASSES[frame]}>● Aktif</Mark> : null}
      {hasNote ? (
        <Mark>
          <span aria-hidden="true">✎ </span>Not var
        </Mark>
      ) : null}
      {isExtraCopy ? <Mark>Ek kopya</Mark> : null}
      {heldBy ? <Mark className="border-gold">Elde: {heldBy.join(', ')}</Mark> : null}
    </div>
  ) : null
  const details =
    card.kind === 'cursed' ? null : (
      // The labels are for screen readers; on the face the values use the full width.
      <dl className="flex flex-col gap-0.5 text-xs text-ink-muted">
        <div className="flex flex-wrap gap-x-1">
          <dt className="sr-only">Set</dt>
          <dd className="after:ml-1 after:content-['·']">{setLabel(card) ?? NO_VALUE}</dd>
          <dt className="sr-only">Rarity</dt>
          <dd>{rarityLabel(card) ?? NO_VALUE}</dd>
        </div>
        <div>
          <dt className="sr-only">Mechanic Pack</dt>
          <dd className="break-words">{card.mechanicPack ?? NO_VALUE}</dd>
        </div>
      </dl>
    )

  if (picture.src !== null) {
    return (
      <article
        aria-label={card.name}
        data-frame={frame}
        className={cn(
          'flex h-full flex-col gap-2 rounded-xl border-2 bg-pane-raised p-1.5',
          FRAME_CLASSES[frame],
        )}
      >
        <div className="relative">
          <CardPicture src={picture.src} alt={card.name} onError={picture.onError} />
          {/* Over the picture's own cost (its top-left d20) only when the hand changes it. */}
          {change ? (
            costBadge(
              'absolute top-[7.4%] left-[10.7%] -translate-x-1/2 -translate-y-1/2 border-2 shadow-md',
            )
          ) : (
            <span className="sr-only">{costBadge('')}</span>
          )}
          {details ? (
            <>
              {/* Over the picture's set symbol, in its bottom-right corner. */}
              <button
                type="button"
                aria-label="Set, rarity ve mechanic pack"
                aria-describedby={infoId}
                onClick={() => setIsInfoShown((shown) => !shown)}
                onBlur={() => setIsInfoShown(false)}
                className="peer absolute right-[3%] bottom-[2%] z-10 h-[11%] w-[14%] cursor-help rounded-full focus-visible:outline-2 focus-visible:outline-gold"
              />
              {/* Transparent, not hidden, while it is not shown: screen readers and search keep it. It stays inside
                  the picture, so it never widens the page. */}
              <div
                id={infoId}
                data-shown={isInfoShown || undefined}
                className={cn(
                  'pointer-events-none absolute right-[3%] bottom-[14%] z-10 max-w-[94%] rounded-lg border border-line bg-canvas px-2 py-1.5 opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100 motion-reduce:transition-none',
                  isInfoShown && 'opacity-100',
                )}
              >
                {details}
              </div>
            </>
          ) : null}
        </div>
        {name('sr-only')}
        {body('sr-only')}
        {marks}
      </article>
    )
  }

  return (
    <article
      aria-label={card.name}
      data-frame={frame}
      className={cn(
        'flex h-full flex-col gap-2 rounded-xl border-2 bg-pane-raised p-3',
        FRAME_CLASSES[frame],
      )}
    >
      {/* The cost sits above the name, so the name gets the face's full width and long names do not break. */}
      <header className="flex flex-col items-start gap-1.5">
        {costBadge('')}
        {name()}
      </header>
      {marks}
      {body()}
      {details}
    </article>
  )
}

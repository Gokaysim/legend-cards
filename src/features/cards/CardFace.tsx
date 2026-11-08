import type { ReactNode } from 'react'

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
 * One card shown as a card face, without its picture (pictures come with a later change): cost, name, the
 * visible text, and below it the set, rarity and mechanic pack. Cursed cards have none of the last three.
 * A card in a hand shows its cost there and its marks; a held card in the library shows who holds it.
 */
export function CardFace({
  card,
  handCost,
  isActive = false,
  hasNote = false,
  isExtraCopy = false,
  heldBy,
}: CardFaceProps) {
  const frame = cardFrame(card)
  const isInHand = handCost !== undefined
  const cost = (isInHand ? handCost : card.cost) ?? NO_VALUE
  const change = isInHand ? costChange(card.cost, handCost) : null
  const text = visibleText(card.text)
  const hasMarks = isActive || hasNote || isExtraCopy || heldBy !== undefined

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
        <span
          title={change ? `Cost: ${cost} (temel cost: ${card.cost ?? NO_VALUE})` : `Cost: ${cost}`}
          data-cost-change={change ?? undefined}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink',
            change && COST_CHANGE[change].className,
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
        {/* Card names and texts are English: hyphenate them as English on narrow faces. */}
        <h3
          lang="en"
          className="min-w-0 text-sm leading-snug font-semibold break-words hyphens-auto text-ink"
        >
          {card.name}
        </h3>
      </header>
      {hasMarks ? (
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
      ) : null}
      <p
        lang="en"
        className="flex-1 text-sm leading-snug break-words hyphens-auto whitespace-pre-line text-ink"
      >
        {text || NO_VALUE}
      </p>
      {card.kind === 'cursed' ? null : (
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
      )}
    </article>
  )
}

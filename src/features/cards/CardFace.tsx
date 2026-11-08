import { cn } from '@/lib/cn'

import { type CardFrame, cardFrame, NO_VALUE, rarityLabel, setLabel } from './display'
import type { Card } from './schema'
import { visibleText } from './text'

const FRAME_CLASSES: Record<CardFrame, string> = {
  common: 'border-common',
  rare: 'border-gold',
  blessed: 'border-blessed',
  cursed: 'border-cursed',
}

/**
 * One card shown as a card face, without its picture (pictures come with a later change): cost, name, the
 * visible text, and below it the set, rarity and mechanic pack. Cursed cards have none of the last three.
 */
export function CardFace({ card }: { card: Card }) {
  const frame = cardFrame(card)
  const cost = card.cost ?? NO_VALUE
  const text = visibleText(card.text)

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
          title={`Cost: ${cost}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink"
        >
          <span className="sr-only">Cost: </span>
          {cost}
        </span>
        {/* Card names and texts are English: hyphenate them as English on narrow faces. */}
        <h3
          lang="en"
          className="min-w-0 text-sm leading-snug font-semibold break-words hyphens-auto text-ink"
        >
          {card.name}
        </h3>
      </header>
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

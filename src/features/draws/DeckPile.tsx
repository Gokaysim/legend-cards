import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { CSS_BACK_SHAPE, CSS_BACK_TONES, type CssBackTone } from '@/features/art/cssBack'
import { CssBackGlyph } from '@/features/art/NeutralCardBack'
import { type SpreadBack, spreadBackUrl } from '@/features/art/spreadBack'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

export type DeckPileProps = {
  /** The deck's back: the chosen set's cardback, the Cursed one, or the neutral back. */
  back: SpreadBack
  /** How many cards a draw picks from. */
  count: number
  className?: string
}

/**
 * The deck in the middle of the draw table (design D4 of `improve-draw-and-give-dialogs`): three backs stacked with
 * small offsets, and the number of cards a draw picks from in a gold badge on top. The back comes from the deck,
 * never from a card, as a face-down card's does; a set without a cardback picture shows the neutral back.
 */
export function DeckPile({ back, count, className }: DeckPileProps) {
  const picture = usePicture(spreadBackUrl(useArt(), back))
  const tone: CssBackTone = back.kind === 'cursed' ? 'cursed' : 'neutral'
  const layer = (offset: string, extra?: string) =>
    picture.src === null ? (
      <div aria-hidden="true" className={cn(CSS_BACK_SHAPE, CSS_BACK_TONES[tone], offset, extra)}>
        <CssBackGlyph tone={tone} />
      </div>
    ) : (
      <div aria-hidden="true" className={cn('overflow-hidden rounded-xl', offset, extra)}>
        <CardPicture src={picture.src} alt="" onError={picture.onError} className="rounded-none" />
      </div>
    )

  return (
    <div
      data-testid="deck-pile"
      data-back={picture.src ?? `css-${tone}`}
      className={cn('relative mt-2 mr-2 self-stretch', className)}
    >
      {layer('absolute inset-0 translate-x-2 -translate-y-2', 'opacity-45')}
      {layer('absolute inset-0 translate-x-1 -translate-y-1', 'opacity-70')}
      {layer('relative drop-shadow-lift')}
      <span
        aria-hidden="true"
        className="absolute -top-3 -right-3 flex h-10 min-w-10 items-center justify-center rounded-full bg-gold px-2.5 text-base font-extrabold text-canvas tabular-nums shadow-[0_0_0_3px_var(--color-pane)]"
      >
        {count}
      </span>
      <p aria-live="polite" className="sr-only">
        {count} uygun kart
      </p>
    </div>
  )
}

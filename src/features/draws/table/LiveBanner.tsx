import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { CSS_BACK_SHAPE, CSS_BACK_TONES } from '@/features/art/cssBack'
import { type SpreadBack, spreadBackUrl } from '@/features/art/spreadBack'
import { usePicture } from '@/features/art/usePicture'
import { usePrefetchPicture } from '@/features/art/usePrefetchPicture'
import type { Card } from '@/features/cards/schema'
import { cn } from '@/lib/cn'

import { LiveMark } from './LiveMark'

/** One small card in the banner: its face once it is face up, its back before. */
export type BannerCard = {
  key: string
  /** The card, or `undefined` while it is not loaded. Never shown while face down, though its picture is fetched. */
  card: Card | undefined
  isUp: boolean
  back: SpreadBack
}

export type LiveBannerProps = {
  /** "Ayla kart çekiyor · 3 kart · 1 açık". */
  text: string
  cards: readonly BannerCard[]
  onShow: () => void
  /** More controls after "Göster", such as the DM's "Bitir". */
  actions?: ReactNode
}

/**
 * The shrunk view of a draw or a pack going on, the same for both (spec: live-draws, "Shrinking the watching view";
 * pack-shop, "Draws and packs share one banner"): the live mark, its cards as small pictures, a line that names it,
 * and "Göster".
 */
export function LiveBanner({ text, cards, onShow, actions }: LiveBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold bg-pane px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <LiveMark />
        {cards.length > 0 ? (
          <ol aria-hidden="true" className="flex shrink-0">
            {cards.map((entry) => (
              <li key={entry.key} className="-mr-2.5 w-6.5 last:mr-0">
                {entry.isUp && entry.card ? (
                  <SmallFace card={entry.card} />
                ) : (
                  <SmallBack back={entry.back} card={entry.card} />
                )}
              </li>
            ))}
          </ol>
        ) : null}
        <p className="min-w-0 text-sm break-words text-ink">{text}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="primary" onClick={onShow}>
          Göster
        </Button>
        {actions}
      </div>
    </div>
  )
}

/** The card's picture, or a frame in its kind's color without one. */
function SmallFace({ card }: { card: Card }) {
  const picture = usePicture(useArt().pictureUrl(card.picture))
  return picture.src === null ? (
    <div
      data-testid="banner-face"
      className={cn(
        'aspect-[563/788] rounded-sm border bg-pane-raised',
        card.kind === 'cursed'
          ? 'border-cursed'
          : card.kind === 'blessed'
            ? 'border-blessed'
            : 'border-gold',
      )}
    />
  ) : (
    <CardPicture src={picture.src} alt="" onError={picture.onError} className="rounded-sm" />
  )
}

/** A face-down card's back. The card's picture, once the card is loaded, is fetched meanwhile for its face. */
function SmallBack({ back, card }: { back: SpreadBack; card: Card | undefined }) {
  const art = useArt()
  const picture = usePicture(spreadBackUrl(art, back))
  usePrefetchPicture(card === undefined ? null : art.pictureUrl(card.picture), true)
  return picture.src === null ? (
    <div
      data-testid="banner-back"
      className={cn(
        CSS_BACK_SHAPE,
        CSS_BACK_TONES[back.kind === 'cursed' ? 'cursed' : 'neutral'],
        'rounded-sm border p-0',
      )}
    />
  ) : (
    <CardPicture src={picture.src} alt="" onError={picture.onError} className="rounded-sm" />
  )
}

import { createPortal } from 'react-dom'

import { Dialog } from '@/components/ui/Dialog'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { EffectPicture } from '@/features/custom-draft/EffectPicture'

import { CardFace } from './CardFace'
import { CostBadge } from './CostBadge'
import { costChange, NO_VALUE } from './display'
import type { Definition } from './schema'

export type CardZoomDialogProps = {
  /** A card, or a True Word zoomed from the Kütüphane. */
  card: Definition
  /** Opened from a hand: the card's cost there, the cost override or the card's own cost. */
  handCost?: string | null
  /** Called when the user closes the view: its "✕", Escape, or a click outside the card. The caller unmounts it. */
  onClose: () => void
}

/**
 * One card shown large (spec: card-zoom), opened from a card face's magnifier or a double click on it: the card's
 * picture alone, as large as the screen allows, up to the picture's own size, and a small round "✕" in the window's
 * top-right corner. A hand cost that differs is a badge on the picture's cost corner, as on the face. Without a
 * picture, or when it fails to load, it shows the card's face without pictures, larger. Nothing else: no title, no
 * line, no marks, no note and no controls. The card's name names the view for screen readers. A click outside the
 * card closes it too.
 *
 * Rendered into `document.body`, so no style of the face it came from (a revealed card's 3D turn) reaches it. React
 * still treats it as the face's child, so it closes when the face leaves the screen.
 */
export function CardZoomDialog({ card, handCost, onClose }: CardZoomDialogProps) {
  const art = useArt()
  const picture = usePicture(
    card.kind === 'custom' ? art.customCover(card.base) : art.pictureUrl(card.picture),
  )
  const isInHand = handCost !== undefined
  const cost = (isInHand ? handCost : card.cost) ?? NO_VALUE
  const change = isInHand ? costChange(card.cost, handCost) : null

  return createPortal(
    <Dialog title={card.name} onClose={onClose} closeOnBackdrop bare>
      {/* Fixed in the window's corner, inside the dialog so it stays in the top layer. The card leaves 3rem at the
          top of the window, so the button never covers it. */}
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="fixed top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full border border-line bg-pane text-base leading-none text-ink shadow-lg hover:bg-pane-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span aria-hidden="true">✕</span>
      </button>
      {picture.src !== null && card.kind === 'custom' ? (
        // A Custom Card: its cover with its hand cost, and its effects' pictures beside it, below it on a phone
        // (spec: custom-cards, "The Custom Card's face"). It scrolls inside the window when it does not fit.
        <div className="flex max-h-[calc(100dvh-4rem)] w-[min(calc(100vw-2rem),56rem)] flex-col gap-4 overflow-y-auto sm:flex-row">
          <div className="relative w-full max-w-72 shrink-0 self-center sm:self-start">
            <CardPicture src={picture.src} alt={card.name} onError={picture.onError} />
            <CostBadge
              cost={cost}
              baseCost={card.cost}
              change={change}
              className="absolute top-[7.4%] left-[10.7%] size-12 -translate-x-1/2 -translate-y-1/2 border-2 text-lg shadow-md"
            />
          </div>
          <ul
            aria-label="Efektler"
            className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] content-start gap-2"
          >
            {card.effects.map((effect) => (
              <li key={effect.type} className="flex flex-col gap-1">
                <EffectPicture type={effect.type} cost={effect.cost} />
                <span lang="en" className="text-xs font-semibold text-ink">
                  {`${effect.type} · ${effect.cost}-Cost`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : picture.src !== null ? (
        // The smallest of the window's width, the picture's own width, and the width the window's height leaves; the
        // picture's proportions give the height.
        <div className="relative w-[min(calc(100vw-2rem),563px,calc((100dvh-6rem)*563/788))]">
          <CardPicture src={picture.src} alt={card.name} onError={picture.onError} />
          {change ? (
            // Over the picture's own cost (its top-left d20), as on the face.
            <CostBadge
              cost={cost}
              baseCost={card.cost}
              change={change}
              className="absolute top-[7.4%] left-[10.7%] size-12 -translate-x-1/2 -translate-y-1/2 border-2 text-lg shadow-md"
            />
          ) : null}
        </div>
      ) : (
        <div className="w-80 max-w-[calc(100vw-2rem)]">
          <CardFace card={card} handCost={handCost} isZoomable={false} />
        </div>
      )}
    </Dialog>,
    document.body,
  )
}

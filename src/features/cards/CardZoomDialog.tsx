import { createPortal } from 'react-dom'

import { Dialog } from '@/components/ui/Dialog'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'

import { CardFace } from './CardFace'
import { CostBadge } from './CostBadge'
import { costChange, NO_VALUE, zoomLine } from './display'
import type { Card } from './schema'

export type CardZoomDialogProps = {
  card: Card
  /** Opened from a hand: the card's cost there, the cost override or the card's own cost. */
  handCost?: string | null
  /** Called when the user closes the view: "✕ Kapat", Escape, or a click outside it. The caller unmounts it. */
  onClose: () => void
}

/**
 * One card shown large (spec: card-zoom), opened from a card face's magnifier: the card's name, one line with its
 * set, cost and rarity, and its picture as large as the screen allows, up to the picture's own size. A hand cost that
 * differs is a badge on the picture's cost corner, as on the face. Without a picture, or when it fails to load, it
 * shows the card's face without pictures, larger. Nothing else: no marks, no note, no controls. A click outside it
 * closes it too.
 *
 * Rendered into `document.body`, so no style of the face it came from (a revealed card's 3D turn) reaches it. React
 * still treats it as the face's child, so it closes when the face leaves the screen.
 */
export function CardZoomDialog({ card, handCost, onClose }: CardZoomDialogProps) {
  const picture = usePicture(useArt().pictureUrl(card.picture))
  const isInHand = handCost !== undefined
  const cost = (isInHand ? handCost : card.cost) ?? NO_VALUE
  const change = isInHand ? costChange(card.cost, handCost) : null

  return createPortal(
    <Dialog title={card.name} onClose={onClose} className="sm:max-w-fit" closeOnBackdrop>
      <p className="-mt-3 text-sm text-ink-muted">{zoomLine(card, handCost)}</p>
      {picture.src !== null ? (
        // The smallest of the view's width, the picture's own width, and the width the screen's height leaves after
        // the title and the line; the picture's proportions give the height.
        <div className="relative mx-auto w-[min(100%,563px,calc((100dvh-10rem)*563/788))]">
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
        <div className="mx-auto w-80 max-w-full">
          <CardFace card={card} handCost={handCost} isZoomable={false} />
        </div>
      )}
    </Dialog>,
    document.body,
  )
}

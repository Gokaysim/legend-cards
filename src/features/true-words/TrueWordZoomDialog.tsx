import { createPortal } from 'react-dom'

import { Dialog } from '@/components/ui/Dialog'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { visibleText } from '@/features/cards/text'

import type { TrueWord } from './schema'

export type TrueWordZoomDialogProps = {
  word: TrueWord
  /** Called when the user closes the view: "✕ Kapat", Escape, or a click outside it. The caller unmounts it. */
  onClose: () => void
}

/**
 * One True Word shown large (spec: true-words, "Active True Words above the hand"; design D8), as a card's zoom view
 * shows a card: its name, and its picture as large as the screen allows, up to the picture's own size. Without a
 * picture, or when it fails to load, its visible text. It writes nothing. A click outside it closes it too.
 *
 * Rendered into `document.body`, so no style of what opened it reaches it.
 */
export function TrueWordZoomDialog({ word, onClose }: TrueWordZoomDialogProps) {
  const picture = usePicture(useArt().pictureUrl(word.picture))
  const text = visibleText(word.text)
  return createPortal(
    <Dialog title={`✦ ${word.name}`} onClose={onClose} className="sm:max-w-fit" closeOnBackdrop>
      {picture.src !== null ? (
        // The smallest of the view's width, the picture's own width, and the width the screen's height leaves after
        // the title; the picture's proportions give the height.
        <div className="mx-auto w-[min(100%,563px,calc((100dvh-10rem)*563/788))]">
          <CardPicture src={picture.src} alt={word.name} onError={picture.onError} />
        </div>
      ) : (
        <p lang="en" className="max-w-prose text-sm break-words whitespace-pre-line text-ink">
          {text === '' ? 'Efekt metni yok.' : text}
        </p>
      )}
    </Dialog>,
    document.body,
  )
}

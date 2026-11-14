import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

import { pictureErrorMessage } from './errors'
import {
  CARD_PICTURE_BOX,
  CARDMAKER_PICTURE_BOX,
  CHARACTER_PICTURE_BOX,
  PICTURE_INPUT_TYPES,
  preparePicture,
} from './picture'
import { KEEP_DRAFT, type PictureDraft } from './pictureDraft'

/** The link classes of "İndir": it looks like the form's other buttons. */
const LINK_BUTTON_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-pane-raised'

export type PictureFieldProps = {
  /** The stored picture's path, or `null` for none. */
  stored: string | null
  draft: PictureDraft
  onChange: (draft: PictureDraft) => void
  /** The definition's name: the picture's alternative text. */
  name: string
  /** No connection: no picture can be chosen. */
  disabled: boolean
  /** The section's heading. "Resim" by default; the set form has "Cardback" and "Cardmaker". */
  title?: string
  /**
   * What the picture is: a card's, word's or cardback's (`card`, at the card's proportions and at most 563 × 788 pixels),
   * a Cardmaker (`cardmaker`, at most 480 pixels high, shown whole), or a character's photo (`portrait`, cropped to 3:4
   * and at most 600 × 800 pixels).
   */
  shape?: 'card' | 'cardmaker' | 'portrait'
}

const BOXES = {
  card: CARD_PICTURE_BOX,
  cardmaker: CARDMAKER_PICTURE_BOX,
  portrait: CHARACTER_PICTURE_BOX,
} as const

const HINTS = {
  card: 'PNG, JPEG ya da WebP; en fazla 563 × 788 piksele küçültülür.',
  cardmaker: 'PNG, JPEG ya da WebP; en fazla 480 piksel yüksekliğe küçültülür, saydamlığı kalır.',
  portrait: 'PNG, JPEG ya da WebP; ortasından 3:4 kırpılır, en fazla 600 × 800 piksele küçültülür.',
} as const

/**
 * The "Resim" section of the DM's card and True Word forms (spec: definition-editing, "The picture in the forms",
 * "Downloading a picture", "Preparing a picture"). It previews the stored picture or the chosen one. "Resim seç"
 * prepares a PNG, JPEG or WebP file as a WebP, "Resmi kaldır" removes the picture, "Vazgeç" drops an unsaved choice,
 * and "İndir" downloads the stored picture. Nothing is stored until the form is saved.
 */
export function PictureField({
  stored,
  draft,
  onChange,
  name,
  disabled,
  title = 'Resim',
  shape = 'card',
}: PictureFieldProps) {
  const ids = useId()
  const input = useRef<HTMLInputElement>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const storedUrl = useArt().pictureUrl(stored)
  const storedPicture = usePicture(storedUrl)

  // The chosen picture's preview lives as long as the choice.
  useEffect(() => {
    if (draft.kind !== 'new') return
    const url = draft.previewUrl
    return () => URL.revokeObjectURL(url)
  }, [draft])

  const choose = async (file: File | undefined) => {
    if (file === undefined) return
    setError(null)
    setIsPreparing(true)
    try {
      const prepared = await preparePicture(file, undefined, BOXES[shape])
      onChange({ kind: 'new', prepared, previewUrl: URL.createObjectURL(prepared.blob) })
    } catch (failure) {
      setError(pictureErrorMessage(failure) ?? 'Resim hazırlanamadı. Başka bir dosya dene.')
    } finally {
      setIsPreparing(false)
      // The same file can be chosen again after a failure or "Vazgeç".
      if (input.current) input.current.value = ''
    }
  }

  const shown =
    draft.kind === 'new' ? draft.previewUrl : draft.kind === 'keep' ? storedPicture.src : null
  const hasPicture = draft.kind === 'new' || (draft.kind === 'keep' && stored !== null)
  const note =
    draft.kind === 'new'
      ? 'Kaydedince bu resim yüklenir.'
      : draft.kind === 'remove'
        ? 'Kaydedince resim kaldırılır.'
        : stored !== null && storedPicture.src === null
          ? 'Resim gösterilemiyor.'
          : null

  return (
    <section aria-labelledby={`${ids}-title`} className="flex flex-col gap-2">
      <h3 id={`${ids}-title`} className="text-sm text-ink-muted">
        {title}
      </h3>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-28 shrink-0">
          {shown !== null && shape === 'portrait' ? (
            <img
              src={shown}
              alt={name}
              onError={draft.kind === 'keep' ? storedPicture.onError : undefined}
              className="block aspect-[3/4] h-auto w-full rounded-lg object-cover"
            />
          ) : shown !== null && shape === 'cardmaker' ? (
            <img
              src={shown}
              alt={name}
              onError={draft.kind === 'keep' ? storedPicture.onError : undefined}
              className="block aspect-[563/788] h-auto w-full object-contain"
            />
          ) : shown !== null ? (
            <CardPicture
              src={shown}
              alt={name}
              onError={draft.kind === 'keep' ? storedPicture.onError : undefined}
            />
          ) : (
            <div
              className={cn(
                'flex w-full items-center justify-center rounded-lg border border-dashed border-control-line p-2 text-center text-xs text-ink-muted',
                shape === 'portrait' ? 'aspect-[3/4]' : 'aspect-[563/788]',
              )}
            >
              Resim yok
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button disabled={disabled || isPreparing} onClick={() => input.current?.click()}>
              {isPreparing ? 'Hazırlanıyor…' : 'Resim seç'}
            </Button>
            {hasPicture ? (
              <Button
                variant="danger"
                disabled={disabled || isPreparing}
                onClick={() => {
                  setError(null)
                  onChange(stored === null ? KEEP_DRAFT : { kind: 'remove' })
                }}
              >
                Resmi kaldır
              </Button>
            ) : null}
            {draft.kind !== 'keep' && stored !== null ? (
              <Button
                variant="ghost"
                disabled={isPreparing}
                onClick={() => {
                  setError(null)
                  onChange(KEEP_DRAFT)
                }}
              >
                Vazgeç
              </Button>
            ) : null}
            {draft.kind === 'keep' && storedUrl !== null ? (
              <a href={storedUrl} download className={LINK_BUTTON_CLASSES}>
                İndir
              </a>
            ) : null}
          </div>
          <input
            ref={input}
            type="file"
            accept={PICTURE_INPUT_TYPES.join(',')}
            aria-label={`${title} dosyası`}
            hidden
            disabled={disabled || isPreparing}
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          {note !== null ? <p className="text-xs text-ink-muted">{note}</p> : null}
          {error !== null ? (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-ink-muted">{HINTS[shape]}</p>
        </div>
      </div>
    </section>
  )
}

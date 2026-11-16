import { useArt } from '@/features/art/artContext'
import { usePicture } from '@/features/art/usePicture'

/** v2.2.8's picture of a card with its parts labeled, built with the Cardmaker pictures. */
export const CARD_INFO_STEM = 'card_info'

/** It explains the parts of a card, so screen readers read it, in the picture's own English labels. */
export const CARD_INFO_ALT =
  'Bir kartın bölümleri: sol üst köşede maliyeti (Cost), ortada adı (Name), altında etkisi (Effect), sağ alt köşede seti (Set).'

/**
 * The `card_info` picture at the top of the rules (spec: rules-page, "The card anatomy picture"; design D2 and D4 of
 * `show-card-info-and-log-corner-cardmaker`). From 640 px it floats at the right of the text, half its width, so the
 * lines wrap beside it. Narrower, it takes the full width, so its labels stay readable. Unlike the Cardmaker, it shows
 * on a phone. Without its picture, or when it fails to load, nothing is shown.
 */
export function RulesPicture() {
  const picture = usePicture(useArt().mascotUrl(CARD_INFO_STEM))
  if (picture.src === null) return null
  return (
    <img
      src={picture.src}
      alt={CARD_INFO_ALT}
      data-rules-picture
      decoding="async"
      draggable={false}
      onError={picture.onError}
      className="pointer-events-none mb-4 block h-auto w-full drop-shadow-lift sm:float-right sm:ml-6 sm:w-1/2"
    />
  )
}

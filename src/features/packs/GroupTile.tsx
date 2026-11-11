import { Link } from 'react-router'

import { CardPicture } from '@/features/art/CardPicture'
import { type SpeechLine, useSpeechTrigger } from '@/features/art/cardmakerSpeech'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

export type GroupTileProps = {
  /** Where the group's packs are shown. */
  to: string
  /** The group's name: "Kesqerian Nights Packs", "Golden Packs". */
  title: string
  /** The group's picture (`groupArtUrl`), or `null` for its glyph. */
  pictureUrl: string | null
  /** The Golden Packs: a gold border and name, and `✦` in place of `♜`. */
  isGolden?: boolean
  /** What the Cardmaker says while the pointer or the focus rests on the tile (spec: cardmaker-speech), if anything. */
  speech?: SpeechLine | null
}

/**
 * One group in the Pack Shop's main view (spec: card-images, design D8): the group's picture across the tile, as in
 * v2.2.8, with its name under it. Without a picture, its glyph stands in. Selecting it shows the group's packs. It lifts
 * and brightens under the pointer or the focus (spec: visual-effects).
 */
export function GroupTile({
  to,
  title,
  pictureUrl,
  isGolden = false,
  speech = null,
}: GroupTileProps) {
  const picture = usePicture(pictureUrl)
  const speechTrigger = useSpeechTrigger(speech)
  return (
    <li className="flex flex-col" {...speechTrigger}>
      <Link
        to={to}
        aria-label={`${title}: paketleri gör`}
        className={cn(
          'flex min-h-32 grow flex-col gap-3 rounded-2xl border border-line bg-pane p-4 text-center transition hover:border-gold hover:bg-pane-raised hover:brightness-110 motion-safe:hover:-translate-y-0.75 motion-safe:focus-visible:-translate-y-0.75',
          isGolden && 'border-gold',
        )}
      >
        {picture.src === null ? (
          <span aria-hidden="true" className="my-auto text-3xl leading-none">
            {isGolden ? '✦' : '♜'}
          </span>
        ) : (
          // The label names the group: the picture is decoration.
          <CardPicture src={picture.src} alt="" onError={picture.onError} className="w-full" />
        )}
        <span
          data-group-name
          className={cn(
            'font-semibold break-words',
            picture.src === null ? 'text-center' : 'text-left',
            isGolden ? 'text-gold' : 'text-ink',
          )}
        >
          {title}
        </span>
      </Link>
    </li>
  )
}

import { useArt } from '@/features/art/artContext'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

import { initialOf } from './initial'
import type { Character } from './schema'

export type CharacterPortraitProps = {
  character: Pick<Character, 'name' | 'picture'>
  className?: string
  /** The initial's size: large in the selected character's view, small in a character tab or a list row. */
  size?: 'large' | 'small'
  /** `true` where the name stands right beside it, in the same control: the photo then has no alternative text. */
  isDecorative?: boolean
}

/**
 * A character's 3:4 frame (spec: characters, "Character tabs"): its photo, or the first letter of its name when it has
 * none or the photo cannot be loaded. The photo's alternative text is the name, or none where the name is part of the
 * same control. The letter is hidden from screen readers.
 */
export function CharacterPortrait({
  character,
  className,
  size = 'large',
  isDecorative = false,
}: CharacterPortraitProps) {
  const picture = usePicture(useArt().pictureUrl(character.picture))
  return (
    <div
      className={cn(
        'flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-pane-raised',
        className,
      )}
    >
      {picture.src !== null ? (
        <img
          src={picture.src}
          alt={isDecorative ? '' : character.name}
          onError={picture.onError}
          className="block size-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          data-character-initial=""
          className={cn(
            'font-semibold text-ink-muted select-none',
            size === 'large' ? 'text-5xl' : 'text-lg',
          )}
        >
          {initialOf(character.name)}
        </span>
      )}
    </div>
  )
}

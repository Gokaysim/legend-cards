import { cn } from '@/lib/cn'

import { useArt } from './artContext'
import { usePicture } from './usePicture'

export type MascotProps = {
  /** The Cardmaker picture's stem, for example `cardmaker_lib`. */
  stem: string
  className?: string
}

/**
 * The Cardmaker, as decoration without alternative text (design D9). Without its picture, or when it fails to load,
 * nothing is shown.
 */
export function Mascot({ stem, className }: MascotProps) {
  const picture = usePicture(useArt().mascotUrl(stem))
  if (picture.src === null) return null
  return (
    <img
      src={picture.src}
      alt=""
      data-mascot={stem}
      decoding="async"
      draggable={false}
      onError={picture.onError}
      className={cn('block h-auto w-auto shrink-0 object-contain', className)}
    />
  )
}

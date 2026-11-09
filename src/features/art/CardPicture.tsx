import { cn } from '@/lib/cn'

/** The size of the owner's card, cardback, pack and True Word pictures. */
export const PICTURE_WIDTH = 563
export const PICTURE_HEIGHT = 788

export type CardPictureProps = {
  src: string
  /** The name the picture shows, or `''` when the text beside it already says it. */
  alt: string
  onError?: () => void
  className?: string
}

/** A card, cardback, pack or True Word picture at the card's proportions, loaded when it comes into view. */
export function CardPicture({ src, alt, onError, className }: CardPictureProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={PICTURE_WIDTH}
      height={PICTURE_HEIGHT}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={onError}
      className={cn('block aspect-[563/788] h-auto w-full rounded-lg object-cover', className)}
    />
  )
}

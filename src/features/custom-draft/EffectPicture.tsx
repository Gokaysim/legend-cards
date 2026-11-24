import { useArt } from '@/features/art/artContext'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

import type { CustomCost, EffectType } from './draftRules'

export type EffectPictureProps = {
  type: EffectType
  cost: CustomCost
  className?: string
}

/**
 * A custom effect's picture at a cost (design D6 of add-custom-card-draft), or its type and cost as text when the
 * picture is not built or fails to load.
 */
export function EffectPicture({ type, cost, className }: EffectPictureProps) {
  const art = useArt()
  const picture = usePicture(art.customEffect(cost, type))
  return picture.src === null ? (
    <span
      className={cn(
        'flex aspect-[5/7] w-full flex-col items-center justify-center rounded-lg border border-custom-ink bg-pane-raised p-1 text-center text-xs font-semibold text-custom-ink',
        className,
      )}
    >
      <span lang="en">{type}</span>
      <span>{`${cost}-Cost`}</span>
    </span>
  ) : (
    <img
      src={picture.src}
      alt=""
      onError={picture.onError}
      className={cn('aspect-[5/7] w-full rounded-lg object-cover', className)}
    />
  )
}

export type CoverPictureProps = { cost: CustomCost; className?: string }

/** A Custom Card cover for its draft cost, or "✧ n" when the cover is not built. */
export function CoverPicture({ cost, className }: CoverPictureProps) {
  const art = useArt()
  const picture = usePicture(art.customCover(cost))
  return picture.src === null ? (
    <span
      className={cn(
        'flex aspect-[5/7] w-full items-center justify-center rounded-xl border border-custom-ink bg-pane-raised text-3xl font-semibold text-custom-ink',
        className,
      )}
    >
      {`✧ ${cost}`}
    </span>
  ) : (
    <img
      src={picture.src}
      alt=""
      onError={picture.onError}
      className={cn('aspect-[5/7] w-full rounded-xl object-cover', className)}
    />
  )
}

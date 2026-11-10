import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { isCursedPackType } from '@/features/draws/schema'
import { cn } from '@/lib/cn'

import { type PackDef, packTitle, priceLabel } from './catalog'

/** The ridged frames around a pack's picture (design D9), from `src/styles/effects.css`. */
const PACK_FRAMES = { premium: 'pack-frame-premium', cursed: 'pack-frame-cursed' } as const

export type PackTileProps = {
  def: PackDef
  /** Hidden for the Mechanic Packs, whose price is in their section heading. */
  showPrice: boolean
  /** Why the pack cannot be opened now, or `null` when it can. */
  disabledReason: string | null
  onOpen: (def: PackDef) => void
}

/**
 * One pack in the shop: its picture, name and price. Selecting it opens the confirmation. A pack that cannot be
 * opened shows why. Cursed types are drawn in the cursed tone. The picture is the pack's own, or for a set's pack
 * without one its set's cardback, as in the legacy app (design D8); without either, a glyph stands in. A set's
 * Premium Pack frames its picture in ridged gold, and the Cursed types in ridged red (spec: visual-effects).
 */
export function PackTile({ def, showPrice, disabledReason, onOpen }: PackTileProps) {
  const art = useArt()
  const picture = usePicture(
    art.packUrl(def.key) ?? (def.setCode === null ? null : art.backUrl(def.setCode)),
  )
  const title = packTitle(def)
  const isCursed = isCursedPackType(def.type)
  // A set's Premium Pack gets the gold frame and the Cursed types the red one, as in v2.2.8.
  const frame = def.type === 'premium' ? 'premium' : isCursed ? 'cursed' : null
  const reasonId = `pack-${def.key}-reason`
  return (
    <li className="flex flex-col gap-2">
      <button
        type="button"
        aria-label={`${title} aç`}
        aria-describedby={disabledReason === null ? undefined : reasonId}
        disabled={disabledReason !== null}
        onClick={() => onOpen(def)}
        // A pack that can be opened lifts and brightens under the pointer or the focus; one that cannot is greyed out.
        className={cn(
          'flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border bg-pane p-4 text-center transition enabled:hover:bg-pane-raised enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale-45 motion-safe:enabled:hover:-translate-y-0.75 motion-safe:enabled:focus-visible:-translate-y-0.75',
          isCursed
            ? 'border-cursed enabled:hover:border-cursed'
            : 'border-line enabled:hover:border-gold',
        )}
      >
        {picture.src === null ? (
          <span aria-hidden="true" className="text-3xl leading-none">
            {isCursed ? '☠' : def.type === 'golden' ? '✦' : '🎴'}
          </span>
        ) : (
          // The name is on the tile: the picture is decoration.
          <span
            data-pack-frame={frame ?? undefined}
            className={cn('block w-full max-w-40', frame && PACK_FRAMES[frame])}
          >
            <CardPicture src={picture.src} alt="" onError={picture.onError} className="w-full" />
          </span>
        )}
        <span className="font-semibold break-words text-ink">{title}</span>
        {showPrice ? (
          <span className="text-sm text-gold tabular-nums">{priceLabel(def.type)}</span>
        ) : null}
      </button>
      {disabledReason === null ? null : (
        <p id={reasonId} className="text-xs text-ink-muted">
          {disabledReason}
        </p>
      )}
    </li>
  )
}

import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { type SpeechLine, useSpeechTrigger } from '@/features/art/cardmakerSpeech'
import { usePicture } from '@/features/art/usePicture'
import { isCursedPackType } from '@/features/draws/schema'
import { cn } from '@/lib/cn'

import { type PackDef, packShortName, packTitle, priceLabel } from './catalog'

/** The ridged frames around a pack's picture (design D9), from `src/styles/effects.css`. */
const PACK_FRAMES = { premium: 'pack-frame-premium', cursed: 'pack-frame-cursed' } as const

/**
 * v2.2.8's two scales (design D7): the shop's main view, and the larger tiles inside a group.
 */
const VARIANTS = {
  shop: { tile: 'p-4', price: 'text-sm', name: 'text-base font-bold' },
  group: { tile: 'p-5', price: 'text-base', name: 'text-lg font-extrabold' },
} as const

export type PackTileVariant = keyof typeof VARIANTS

export type PackTileProps = {
  def: PackDef
  /** Why the pack cannot be opened now, or `null` when it can. */
  disabledReason: string | null
  onOpen: (def: PackDef) => void
  /**
   * `shop` in the shop's main view, for the Mechanic Packs: the full name and no price, which is in the section's
   * heading. `group` inside a set's group or the Golden Packs: the short name with the price under it.
   */
  variant: PackTileVariant
  /** What the Cardmaker says while the pointer or the focus rests on the tile (spec: cardmaker-speech), if anything. */
  speech?: SpeechLine | null
}

/**
 * One pack in the shop (spec: card-images, "Pack pictures in the shop"; design D4 of `polish-cards-packs-and-mascots`):
 * its picture across the tile, or a glyph without one, then its name under it. Inside a group, that is the short name
 * ("Standart", "Premium", "Cursed"…) with the price under it; in the main view, a Mechanic Pack's full name without a
 * price. The button's label always names the pack in full. Selecting it opens the confirmation. A pack that cannot be
 * opened shows why. Cursed types are drawn in the cursed tone.
 *
 * The picture is the pack's own, or for a set's pack without one its set's cardback (design D8 of add-card-images).
 * A set's Premium Pack frames its picture in ridged gold, and the Cursed types in ridged red (spec: visual-effects).
 */
export function PackTile({ def, disabledReason, onOpen, variant, speech = null }: PackTileProps) {
  const art = useArt()
  // On the <li>, not the button: a pack that cannot be opened still makes her speak, as in v2.2.8.
  const speechTrigger = useSpeechTrigger(speech)
  const picture = usePicture(
    art.packUrl(def.key) ?? (def.setCode === null ? null : art.backUrl(def.setCode)),
  )
  const title = packTitle(def)
  const isCursed = isCursedPackType(def.type)
  // A set's Premium Pack gets the gold frame and the Cursed types the red one, as in v2.2.8.
  const frame = def.type === 'premium' ? 'premium' : isCursed ? 'cursed' : null
  const isInGroup = variant === 'group'
  const scale = VARIANTS[variant]
  const reasonId = `pack-${def.key}-reason`
  return (
    <li className="flex flex-col gap-2" {...speechTrigger}>
      <button
        type="button"
        aria-label={`${title} aç`}
        aria-describedby={disabledReason === null ? undefined : reasonId}
        disabled={disabledReason !== null}
        onClick={() => onOpen(def)}
        // A pack that can be opened lifts and brightens under the pointer or the focus; one that cannot is greyed out.
        className={cn(
          'flex min-h-32 grow flex-col gap-3 rounded-2xl border bg-pane text-center transition enabled:hover:bg-pane-raised enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale-45 motion-safe:enabled:hover:-translate-y-0.75 motion-safe:enabled:focus-visible:-translate-y-0.75',
          scale.tile,
          isCursed
            ? 'border-cursed enabled:hover:border-cursed'
            : 'border-line enabled:hover:border-gold',
        )}
      >
        {picture.src === null ? (
          <span aria-hidden="true" className="my-auto text-3xl leading-none">
            {isCursed ? '☠' : def.type === 'golden' ? '✦' : '🎴'}
          </span>
        ) : (
          // The button's label names the pack: the picture is decoration.
          <span
            data-pack-frame={frame ?? undefined}
            className={cn('block w-full', frame && PACK_FRAMES[frame])}
          >
            <CardPicture src={picture.src} alt="" onError={picture.onError} className="w-full" />
          </span>
        )}
        <span data-pack-text className="flex flex-col gap-0.5">
          {/* A Mechanic Pack's name sits left under its picture, as in v2.2.8; a group's names are centered. */}
          <span
            data-pack-name
            className={cn(
              'break-words text-ink',
              picture.src !== null && !isInGroup && 'text-left',
              scale.name,
            )}
          >
            {isInGroup ? packShortName(def) : title}
          </span>
          {isInGroup ? (
            <span
              data-pack-price
              className={cn('font-extrabold text-gold tabular-nums', scale.price)}
            >
              {priceLabel(def.type)}
            </span>
          ) : null}
        </span>
      </button>
      {disabledReason === null ? null : (
        <p id={reasonId} className="text-xs text-ink-muted">
          {disabledReason}
        </p>
      )}
    </li>
  )
}

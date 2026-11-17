import { PopoverTrigger } from '@/components/ui/PopoverTrigger'
import { cn } from '@/lib/cn'
import { usePopover } from '@/lib/usePopover'

import { CharacterEffectsPopover } from './CharacterEffectsPopover'
import { CharacterPortrait } from './CharacterPortrait'
import type { EffectRow } from './effectRows'
import type { Character } from './schema'

/** The gap the popover keeps from the window's edges, in CSS pixels. */
const EDGE = 8

/**
 * Moves the popover left when it would cross the window's right edge, for a tab near it, so the popover never widens
 * the page (spec: character-effects, "Effects on a character's tab").
 */
function keepInView(element: HTMLDivElement | null) {
  if (element === null) return
  const { left, right } = element.getBoundingClientRect()
  const limit = document.documentElement.clientWidth - EDGE
  if (right > limit) element.style.left = `${Math.max(limit - right, EDGE - left)}px`
}

/** A character with its effects, as the hand's tab row shows its tab. */
export type CharacterTabEntry = {
  character: Character
  /** Its effects, held ones included, in the order of its "Aktif efektler". */
  effects: readonly EffectRow[]
}

export type CharacterTabProps = {
  character: Character
  /** The tab's element ID, which the view names as its label. */
  id: string
  /** The view's element ID. */
  controls: string
  isSelected: boolean
  onSelect: () => void
  /** Its effects, held ones included, in the order of its "Aktif efektler". */
  effects: readonly EffectRow[]
  /** The tab's look in the row it sits in, marked or not. */
  className?: string
}

/**
 * A character's tab in the hand's tab row (spec: characters, "Character tabs"; character-effects, "The effect count on
 * a character's tab" and "Effects on a character's tab"; design D2, D4 of redesign-hand-dashboard): a small 3:4
 * thumbnail of its photo, its name, cut short with "…" when long, and "✦ <count>" when effects are on it. Resting a
 * mouse or pen on it, or focusing it from the keyboard, shows its effects in a popover; a tap only opens the character.
 */
export function CharacterTab({
  character,
  id,
  controls,
  isSelected,
  onSelect,
  effects,
  className,
}: CharacterTabProps) {
  const popover = usePopover()
  const popoverId = `${id}-effects`
  const count = effects.length
  return (
    <div className="relative max-w-full min-w-0">
      <PopoverTrigger
        state={popover}
        tap="ignore"
        role="tab"
        id={id}
        aria-selected={isSelected}
        aria-controls={controls}
        aria-describedby={popover.isOpen ? popoverId : undefined}
        onClick={onSelect}
        className={cn('flex max-w-full min-w-0 items-center gap-2 text-left', className)}
      >
        <CharacterPortrait
          character={character}
          size="small"
          isDecorative
          className="w-6 shrink-0 rounded-md"
        />
        <span className="max-w-40 min-w-0 truncate">{character.name}</span>
        {count > 0 ? (
          <>
            <span
              aria-hidden="true"
              data-effect-count=""
              className="shrink-0 text-xs font-semibold text-gold"
            >
              ✦ {count}
            </span>
            <span className="sr-only">, {count} aktif efekt</span>
          </>
        ) : null}
      </PopoverTrigger>
      {popover.isOpen ? (
        <div
          ref={keepInView}
          className="absolute top-full left-0 z-40 mt-1.5 w-72 max-w-[calc(100vw-2rem)]"
        >
          <CharacterEffectsPopover id={popoverId} characterName={character.name} rows={effects} />
        </div>
      ) : null}
    </div>
  )
}

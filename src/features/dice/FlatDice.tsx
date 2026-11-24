import { cn } from '@/lib/cn'

import { type PartView, NATURAL_MARK_TEXT } from './rollView'
import type { DiceStyle } from './schema'
import { previewUrl } from './stage/previews'

export type FlatDiceProps = {
  /** One part of a roll: a roll of one part has only one. */
  view: PartView
  style: DiceStyle
  /** `sm` for the channel and the card, `lg` for the strip without 3D. */
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * The dice of one part of a roll as pictures with their results (design D7): the style's preview of each die and the face it
 * shows. A die the roll does not keep is dimmed and struck through. Serves the channel, the card's text, and the strip
 * and the card when there is no 3D.
 */
export function FlatDice({ view, style, size = 'sm', className }: FlatDiceProps) {
  const picture = size === 'lg' ? 'size-10' : 'size-5.5'
  return (
    <ul
      aria-label="Zarlar"
      className={cn('flex flex-wrap items-center gap-1.5', size === 'lg' && 'gap-2.5', className)}
    >
      {view.results.map((result) => (
        <li
          key={result.key}
          data-kept={result.isKept}
          className={cn(
            'flex items-center gap-1 rounded-lg py-0.5 pr-2 pl-0.5 font-bold',
            size === 'lg' ? 'bg-pane/80 text-xl' : 'bg-pane-raised text-sm',
            !result.isKept && 'bg-pane text-ink-muted line-through',
            result.isKept && view.mark === 'natural20' && 'text-gold',
          )}
        >
          <img
            src={previewUrl(style, result.type)}
            alt=""
            className={cn(picture, !result.isKept && 'opacity-50')}
          />
          <span className="sr-only">{`${result.type}: `}</span>
          {result.value}
          {result.isKept ? null : <span className="sr-only"> (sayılmadı)</span>}
        </li>
      ))}
    </ul>
  )
}

/** "Nat 20" in gold or "Nat 1" in red, or nothing. */
export function NaturalMarkLabel({ view, className }: { view: PartView; className?: string }) {
  if (!view.mark) return null
  return (
    <span
      data-mark={view.mark}
      className={cn(
        'text-xs font-extrabold tracking-widest uppercase',
        view.mark === 'natural20' ? 'text-gold' : 'text-cursed',
        className,
      )}
    >
      {NATURAL_MARK_TEXT[view.mark]}
    </span>
  )
}

import { cn } from '@/lib/cn'

import { NO_VALUE } from './display'

const COST_CHANGE = {
  lower: { className: 'border-green text-green', label: 'bu elde daha düşük' },
  higher: { className: 'border-cursed text-cursed', label: 'bu elde daha yüksek' },
} as const

export type CostBadgeProps = {
  /** The cost shown: in a hand, the hand cost; otherwise the card's own cost. `NO_VALUE` when there is none. */
  cost: string
  /** The card's own cost, named when the shown cost differs from it. */
  baseCost: string | null
  /** How the shown cost compares with the card's own cost (see `costChange`): marked green or red. */
  change: 'lower' | 'higher' | null
  className?: string
}

/**
 * A card's cost in a round badge. A cost that a hand changes is marked lower (green) or higher (red), and its title
 * and screen reader text name the card's own cost. Shared by the card face and the zoom view.
 */
export function CostBadge({ cost, baseCost, change, className }: CostBadgeProps) {
  return (
    <span
      title={change ? `Cost: ${cost} (temel cost: ${baseCost ?? NO_VALUE})` : `Cost: ${cost}`}
      data-cost-change={change ?? undefined}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink',
        change && COST_CHANGE[change].className,
        className,
      )}
    >
      <span className="sr-only">Cost: </span>
      {cost}
      {change ? (
        <span className="sr-only">
          {` (${COST_CHANGE[change].label}; temel cost: ${baseCost ?? NO_VALUE})`}
        </span>
      ) : null}
    </span>
  )
}

import { cn } from '@/lib/cn'

import { type CostChange, NO_VALUE } from './display'

const COST_MARK = {
  lower: { className: 'border-green text-green', label: 'bu elde daha düşük' },
  higher: { className: 'border-cursed text-cursed', label: 'bu elde daha yüksek' },
} as const

export type CostBadgeProps = {
  /** The cost shown: in a hand, the hand cost; otherwise the card's own cost. `NO_VALUE` when there is none. */
  cost: string
  /** The card's own cost, named when the shown cost differs from it. */
  baseCost: string | null
  /** How the shown cost differs from the card's own cost (see `costChange`), or `null` when it does not. */
  change: CostChange | null
  className?: string
}

/**
 * A card's cost in a round badge. A cost that a hand changes is marked lower (green) or higher (red) when both costs
 * are numbers, and stays neutral otherwise ("X" given "3"). Either way, its title and screen reader text name the
 * card's own cost (design D2 of `show-hand-cost-on-x-and-d6-cards`). Shared by the card face and the zoom view.
 */
export function CostBadge({ cost, baseCost, change, className }: CostBadgeProps) {
  const mark = change === 'lower' || change === 'higher' ? COST_MARK[change] : null
  const base = `temel cost: ${baseCost ?? NO_VALUE}`
  return (
    <span
      title={change ? `Cost: ${cost} (${base})` : `Cost: ${cost}`}
      data-cost-change={mark ? change : undefined}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink',
        mark?.className,
        className,
      )}
    >
      <span className="sr-only">Cost: </span>
      {cost}
      {change ? (
        <span className="sr-only">{mark ? ` (${mark.label}; ${base})` : ` (${base})`}</span>
      ) : null}
    </span>
  )
}

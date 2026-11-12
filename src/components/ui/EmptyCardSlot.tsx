import { cn } from '@/lib/cn'

export type EmptyCardSlotProps = {
  /** "Bir kart seç". */
  title: string
  /** The line under it, saying where to select. */
  hint: string
  className?: string
}

/**
 * The empty place of a card, with dashed edges in a card's 563/788 proportions (design D2 of
 * `redesign-selected-card-panel`): what the details panel beside the hand shows while nothing is selected.
 */
export function EmptyCardSlot({ title, hint, className }: EmptyCardSlotProps) {
  return (
    <div
      data-empty-card-slot=""
      className={cn(
        'mx-auto flex aspect-[563/788] w-full max-w-66 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-sidebar p-6 text-center',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-control-line"
      >
        <rect x="7" y="3" width="12" height="17" rx="2" />
        <path d="M5 6.5v12A2.5 2.5 0 0 0 7.5 21H15" />
        <path d="M13 8.5l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L10 10.8l2-.3z" />
      </svg>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="text-sm leading-normal text-ink-muted">{hint}</p>
    </div>
  )
}

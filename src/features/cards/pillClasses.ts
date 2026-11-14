import { cn } from '@/lib/cn'

/** The pill classes, shared with the bar's toggle pills: gold while a value is chosen. */
export function pillClasses(isOn: boolean): string {
  return cn(
    'inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
    isOn
      ? 'border-gold bg-gold/15 text-ink hover:bg-gold/25'
      : 'border-control-line bg-control text-ink hover:bg-pane-raised',
  )
}

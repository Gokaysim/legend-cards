import { cn } from '@/lib/cn'

export type SpinnerProps = {
  label?: string
  className?: string
}

/** An accessible loading indicator with a visible label. */
export function Spinner({ label = 'Yükleniyor…', className }: SpinnerProps) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-3 text-ink-muted', className)}>
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-line border-t-gold"
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}

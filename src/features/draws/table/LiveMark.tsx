import { cn } from '@/lib/cn'

/**
 * The live mark of a draw or a pack going on (spec: visual-effects, "The live mark"): a small green dot with a soft
 * pulse that stops under reduced motion. Decoration: the text beside it says what is live.
 */
export function LiveMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="live-mark"
      className={cn(
        'inline-block size-2 shrink-0 animate-live-pulse rounded-full bg-green motion-reduce:animate-none',
        className,
      )}
    />
  )
}

import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { usePhoneWidth } from '@/lib/usePhoneWidth'
import { useReducedMotion } from '@/lib/useReducedMotion'

import { useArt } from './artContext'

/** How long the pair stays: `--animate-blessed-shock` in `theme.css`. */
export const BLESSED_SHOCK_MS = 1100

const SIDES = [
  { stem: 'cardmaker_shockl', className: 'left-0' },
  { stem: 'cardmaker_shockr', className: 'right-0' },
] as const

/**
 * The shocked Cardmaker pair for a Blessed card turned over (design D10). `shock()` shows `cardmaker_shockl` at the
 * left edge and `cardmaker_shockr` at the right edge of the viewport for `BLESSED_SHOCK_MS`; another shock meanwhile
 * starts it again. They rise in and sink away, or with reduced motion appear and disappear without moving. A timer
 * removes them, even if the animation never runs (a hidden tab). Without both pictures, and on a phone (spec:
 * card-images, "The shocked Cardmaker for a Blessed card"), `shock()` does nothing.
 *
 * Render `overlay` inside the component's dialog, if it has one: a modal dialog covers anything outside it.
 */
export function useBlessedShock(): { shock: () => void; overlay: ReactNode } {
  const art = useArt()
  const reducedMotion = useReducedMotion()
  const urls = SIDES.map(({ stem }) => art.mascotUrl(stem))
  // On a phone the pair would cover the card that was just turned: no Cardmaker shows there.
  const isPhone = usePhoneWidth()
  const hasPair = urls.every((url) => url !== null) && !isPhone
  // Counts the shocks, so a new one restarts the animation and the timer.
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    if (shown === null) return
    const timer = setTimeout(() => setShown(null), BLESSED_SHOCK_MS)
    return () => clearTimeout(timer)
  }, [shown])

  const shock = useCallback(() => {
    if (hasPair) setShown((count) => (count ?? 0) + 1)
  }, [hasPair])

  const overlay =
    shown === null || !hasPair ? null : (
      <div key={shown} data-testid="blessed-shock" aria-hidden="true">
        {SIDES.map(({ stem, className }, index) => (
          <img
            key={stem}
            src={urls[index] ?? ''}
            alt=""
            data-mascot={stem}
            className={cn(
              'pointer-events-none fixed bottom-0 z-50 h-[56vh] max-h-[86vh] w-[44vw] object-contain object-bottom drop-shadow-lg sm:h-[clamp(330px,51vw,660px)] sm:w-[clamp(270px,36vw,525px)]',
              className,
              !reducedMotion && 'animate-blessed-shock',
            )}
          />
        ))}
      </div>
    )
  return { shock, overlay }
}

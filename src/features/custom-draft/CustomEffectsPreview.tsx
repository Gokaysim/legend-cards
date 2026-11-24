import { useEffect, useState } from 'react'

import type { CustomCardEffect } from '@/features/cards/schema'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useReducedMotion } from '@/lib/useReducedMotion'

import { EffectPicture } from './EffectPicture'

/** How long each effect picture shows while the preview cycles, in ms. */
export const PREVIEW_STEP_MS = 1200

export type CustomEffectsPreviewProps = {
  effects: readonly CustomCardEffect[]
  /** The pointer rests on the face. */
  isShown: boolean
}

/**
 * The hover preview of a Custom Card's face (spec: custom-cards, "The Custom Card's face"): over the cover, on a
 * device with hover, its effects' pictures in turn. With reduced motion they show side by side, without cycling. It
 * lies inside the face, so it never widens the page, and lets the pointer through. Decoration: the face's text names
 * the effects for screen readers.
 */
export function CustomEffectsPreview({ effects, isShown }: CustomEffectsPreviewProps) {
  const hasHover = useMediaQuery('(hover: hover)')
  const isReduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const isCycling = isShown && hasHover && !isReduced && effects.length > 1

  useEffect(() => {
    if (!isCycling) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % effects.length)
    }, PREVIEW_STEP_MS)
    return () => window.clearInterval(timer)
  }, [isCycling, effects.length])

  if (!isShown || !hasHover || effects.length === 0) return null
  const shown = isReduced ? effects : [effects[index % effects.length] ?? effects[0]]
  return (
    <div
      aria-hidden="true"
      data-custom-preview={isReduced ? 'side-by-side' : 'cycling'}
      className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center rounded-lg bg-canvas/85 p-[6%]"
    >
      <ul
        className={
          isReduced
            ? 'grid w-full grid-cols-[repeat(auto-fit,minmax(2.5rem,1fr))] gap-1'
            : 'flex w-4/5 flex-col items-center gap-1'
        }
      >
        {shown.map((effect) =>
          effect === undefined ? null : (
            <li key={effect.type} data-effect={`${effect.cost}:${effect.type}`} className="w-full">
              <EffectPicture type={effect.type} cost={effect.cost} />
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

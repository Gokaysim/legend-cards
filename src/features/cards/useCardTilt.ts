import { type PointerEvent, useCallback, useEffect, useRef } from 'react'

import { useReducedMotion } from '@/lib/useReducedMotion'

/** The CSS variables that `card-tilt` (src/styles/effects.css) reads. */
const TILT_VARIABLES = [
  '--tilt-x',
  '--tilt-y',
  '--push-x',
  '--push-y',
  '--glint-x',
  '--glint-y',
] as const

/** The largest tilt either way, in degrees, and the largest push, in pixels, at the box's edges (v2.2.8). */
const TILT_RANGE_DEG = 5.4
const PUSH_RANGE_PX = 7

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export type CardTilt = {
  /** For the box that tilts: the picture's box, or the CSS face. */
  ref: (element: HTMLElement | null) => void
  /** For the face's root, so a pointer over a control on top of the box still tilts it. Empty when off. */
  handlers: {
    onPointerMove?: (event: PointerEvent) => void
    onPointerLeave?: () => void
    onPointerDown?: (event: PointerEvent) => void
  }
}

/**
 * Tilts a card toward a mouse pointer (spec: visual-effects, design D5). It writes CSS variables and `data-tilt` on
 * the box, once per animation frame, and never renders React on a move. A touch, a pen with a button down, and reduced
 * motion leave the card flat, and so does `isEnabled = false`, used for faces inside dialogs.
 */
export function useCardTilt(isEnabled: boolean): CardTilt {
  const reducedMotion = useReducedMotion()
  const box = useRef<HTMLElement | null>(null)
  const frame = useRef<number | null>(null)
  const isOn = isEnabled && !reducedMotion

  const reset = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    const element = box.current
    if (element === null) return
    element.removeAttribute('data-tilt')
    for (const name of TILT_VARIABLES) element.style.removeProperty(name)
  }, [])

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (element === null) reset()
      box.current = element
    },
    [reset],
  )

  // Turning it off, for example when reduced motion is switched on, flattens a tilted card. Unmounting drops the
  // pending frame.
  useEffect(() => {
    if (!isOn) reset()
    return reset
  }, [isOn, reset])

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch' || (event.pointerType === 'pen' && event.buttons !== 0)) {
        reset()
        return
      }
      const element = box.current
      if (element === null || !element.isConnected) return
      const { clientX, clientY } = event
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const x = clamp01((clientX - rect.left) / rect.width)
        const y = clamp01((clientY - rect.top) / rect.height)
        element.style.setProperty('--tilt-x', `${((0.5 - y) * TILT_RANGE_DEG).toFixed(2)}deg`)
        element.style.setProperty('--tilt-y', `${((x - 0.5) * TILT_RANGE_DEG).toFixed(2)}deg`)
        element.style.setProperty('--push-x', `${((x - 0.5) * PUSH_RANGE_PX).toFixed(2)}px`)
        element.style.setProperty('--push-y', `${((y - 0.5) * PUSH_RANGE_PX).toFixed(2)}px`)
        element.style.setProperty('--glint-x', `${(x * 100).toFixed(1)}%`)
        element.style.setProperty('--glint-y', `${(y * 100).toFixed(1)}%`)
        element.setAttribute('data-tilt', '')
      })
    },
    [reset],
  )

  // A touch or a pen press flattens the card; a mouse press keeps the tilt, so a click does not jolt it.
  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') reset()
    },
    [reset],
  )

  return {
    ref,
    handlers: isOn ? { onPointerMove, onPointerLeave: reset, onPointerDown } : {},
  }
}

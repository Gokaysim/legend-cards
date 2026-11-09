import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function mediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery()
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/**
 * True when the device asks for reduced motion, live. Where the browser cannot tell (no `matchMedia`), it counts as
 * reduced, so nothing waits for an animation that may never run.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => mediaQuery()?.matches ?? true)
}

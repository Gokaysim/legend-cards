import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useReducedMotion } from './useReducedMotion'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A `matchMedia` stand-in whose answer can change, with its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    get matches() {
      return matches
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => query)
  return {
    set(next: boolean) {
      matches = next
      for (const listener of listeners) listener()
    },
  }
}

describe('useReducedMotion', () => {
  it('follows the media query, live', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(useReducedMotion)
    expect(result.current).toBe(false)

    act(() => media.set(true))
    expect(result.current).toBe(true)
  })

  it('counts as reduced where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(useReducedMotion).result.current).toBe(true)
  })
})

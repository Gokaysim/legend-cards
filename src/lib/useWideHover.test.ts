import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWideHover, WIDE_HOVER_QUERY } from './useWideHover'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A `matchMedia` stand-in whose answer for the wide-hover query can change, with its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const asked: string[] = []
  vi.stubGlobal('matchMedia', (query: string) => {
    asked.push(query)
    return {
      get matches() {
        return query === WIDE_HOVER_QUERY && matches
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }
  })
  return {
    asked,
    set(next: boolean) {
      matches = next
      for (const listener of listeners) listener()
    },
  }
}

describe('useWideHover', () => {
  it('asks for a wide window with hover', () => {
    const media = stubMatchMedia(true)
    renderHook(useWideHover)

    expect(media.asked).toContain('(hover: hover) and (min-width: 64rem)')
  })

  it('is true while the query matches, and false while it does not', () => {
    stubMatchMedia(true)
    expect(renderHook(useWideHover).result.current).toBe(true)

    stubMatchMedia(false)
    expect(renderHook(useWideHover).result.current).toBe(false)
  })

  it('follows a change, live', () => {
    const media = stubMatchMedia(true)
    const { result } = renderHook(useWideHover)

    act(() => media.set(false))
    expect(result.current).toBe(false)

    act(() => media.set(true))
    expect(result.current).toBe(true)
  })

  it('is false where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(useWideHover).result.current).toBe(false)
  })
})

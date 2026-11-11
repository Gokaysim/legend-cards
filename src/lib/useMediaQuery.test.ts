import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

const QUERY = '(min-width: 40rem)'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A `matchMedia` stand-in whose answer for `QUERY` can change, with its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query === QUERY && matches
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }))
  return {
    listeners,
    set(next: boolean) {
      matches = next
      for (const listener of listeners) listener()
    },
  }
}

describe('useMediaQuery', () => {
  it('is true while the query matches, and false while it does not', () => {
    stubMatchMedia(true)
    expect(renderHook(() => useMediaQuery(QUERY)).result.current).toBe(true)
    expect(renderHook(() => useMediaQuery('(min-width: 99rem)')).result.current).toBe(false)

    stubMatchMedia(false)
    expect(renderHook(() => useMediaQuery(QUERY)).result.current).toBe(false)
  })

  it('follows a change, live, and stops listening when it unmounts', () => {
    const media = stubMatchMedia(false)
    const { result, unmount } = renderHook(() => useMediaQuery(QUERY))

    act(() => media.set(true))
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)

    unmount()
    expect(media.listeners.size).toBe(0)
  })

  it('is false where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useMediaQuery(QUERY)).result.current).toBe(false)
  })
})

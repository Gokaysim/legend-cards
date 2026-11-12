import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PHONE_WIDTH_QUERY, usePhoneWidth } from './usePhoneWidth'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A `matchMedia` stand-in whose answer for the phone-width query can change, with its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const asked: string[] = []
  vi.stubGlobal('matchMedia', (query: string) => {
    asked.push(query)
    return {
      get matches() {
        return query === PHONE_WIDTH_QUERY && matches
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

describe('usePhoneWidth', () => {
  it('asks for a window narrower than 40rem', () => {
    const media = stubMatchMedia(true)
    renderHook(usePhoneWidth)

    expect(media.asked).toContain('(width < 40rem)')
  })

  it('is true while the query matches, and false while it does not', () => {
    stubMatchMedia(true)
    expect(renderHook(usePhoneWidth).result.current).toBe(true)

    stubMatchMedia(false)
    expect(renderHook(usePhoneWidth).result.current).toBe(false)
  })

  it('follows a change, live', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(usePhoneWidth)

    act(() => media.set(true))
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)
  })

  it('is false where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(usePhoneWidth).result.current).toBe(false)
  })
})

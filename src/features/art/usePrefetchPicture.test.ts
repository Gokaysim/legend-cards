import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePrefetchPicture } from './usePrefetchPicture'

/** The images the hook creates, as a stand-in for `Image` that records each address. */
let created: { src: string; decoding: string; onerror: (() => void) | null }[] = []

class FakeImage {
  src = ''
  decoding = ''
  onerror: (() => void) | null = null
  constructor() {
    created.push(this)
  }
}

beforeEach(() => {
  created = []
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrefetchPicture', () => {
  it('fetches the picture once while enabled', () => {
    renderHook(() => usePrefetchPicture('/stored/cards/eyes.webp', true))

    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ src: '/stored/cards/eyes.webp', decoding: 'async' })
  })

  it('fetches nothing without a picture or while not enabled', () => {
    renderHook(() => usePrefetchPicture(null, true))
    renderHook(() => usePrefetchPicture('/stored/cards/eyes.webp', false))

    expect(created).toHaveLength(0)
  })

  it('does not fetch again on a re-render with the same address', () => {
    const { rerender } = renderHook(({ url }) => usePrefetchPicture(url, true), {
      initialProps: { url: '/stored/cards/eyes.webp' },
    })

    rerender({ url: '/stored/cards/eyes.webp' })
    expect(created).toHaveLength(1)

    rerender({ url: '/stored/cards/rite.webp' })
    expect(created.map((image) => image.src)).toEqual([
      '/stored/cards/eyes.webp',
      '/stored/cards/rite.webp',
    ])
  })

  it('changes nothing when the fetch fails', () => {
    const { result } = renderHook(() => usePrefetchPicture('/stored/cards/missing.webp', true))

    expect(() => created[0]?.onerror?.()).not.toThrow()
    expect(result.current).toBeUndefined()
    expect(created).toHaveLength(1)
  })
})

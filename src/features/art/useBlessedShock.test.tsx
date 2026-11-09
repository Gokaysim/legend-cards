import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import type { ArtManifest } from './schema'
import { BLESSED_SHOCK_MS, useBlessedShock } from './useBlessedShock'

const PAIR = testArt({
  mascots: {
    cardmaker_shockl: '/art/mascots/cardmaker_shockl.0123456789.webp',
    cardmaker_shockr: '/art/mascots/cardmaker_shockr.0123456789.webp',
  },
})

/** Stubs the reduced-motion media query. */
const stubMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))

function renderShock(manifest: ArtManifest = PAIR) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestArtProvider manifest={manifest}>{children}</TestArtProvider>
  )
  const hook = renderHook(useBlessedShock, { wrapper })
  const overlay = () => render(<>{hook.result.current.overlay}</>, { wrapper })
  return { hook, overlay }
}

const pair = () =>
  [...document.querySelectorAll('[data-testid="blessed-shock"] img')].map((img) =>
    img.getAttribute('data-mascot'),
  )

beforeEach(() => {
  vi.useFakeTimers()
  stubMotion(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useBlessedShock', () => {
  it('shows the pair at both edges, rising in, and removes it after 1.1 s', () => {
    const { hook } = renderShock()
    expect(hook.result.current.overlay).toBeNull()

    act(() => hook.result.current.shock())
    const { unmount } = render(<>{hook.result.current.overlay}</>)
    expect(pair()).toEqual(['cardmaker_shockl', 'cardmaker_shockr'])
    const [left, right] = screen.getByTestId('blessed-shock').querySelectorAll('img')
    expect(left).toHaveClass('fixed', 'left-0', 'pointer-events-none', 'animate-blessed-shock')
    expect(right).toHaveClass('fixed', 'right-0', 'animate-blessed-shock')
    expect(screen.getByTestId('blessed-shock')).toHaveAttribute('aria-hidden', 'true')
    unmount()

    act(() => {
      vi.advanceTimersByTime(BLESSED_SHOCK_MS - 1)
    })
    expect(hook.result.current.overlay).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(hook.result.current.overlay).toBeNull()
  })

  it('starts again for a second Blessed card meanwhile', () => {
    const { hook } = renderShock()
    act(() => hook.result.current.shock())
    act(() => {
      vi.advanceTimersByTime(800)
    })
    act(() => hook.result.current.shock())
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(hook.result.current.overlay).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(hook.result.current.overlay).toBeNull()
  })

  it('shows the pair without movement under reduced motion', () => {
    stubMotion(true)
    const { hook } = renderShock()

    act(() => hook.result.current.shock())
    render(<>{hook.result.current.overlay}</>)

    expect(pair()).toEqual(['cardmaker_shockl', 'cardmaker_shockr'])
    for (const img of screen.getByTestId('blessed-shock').querySelectorAll('img')) {
      expect(img).not.toHaveClass('animate-blessed-shock')
    }
  })

  it('does nothing without both pictures', () => {
    const half = testArt({
      mascots: { cardmaker_shockl: '/art/mascots/cardmaker_shockl.0123456789.webp' },
    })
    for (const manifest of [half, testArt({})]) {
      const { hook } = renderShock(manifest)
      act(() => hook.result.current.shock())
      expect(hook.result.current.overlay).toBeNull()
    }
  })
})

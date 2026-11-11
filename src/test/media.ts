import { vi } from 'vitest'

import { WIDE_HOVER_QUERY } from '@/lib/useWideHover'
import { WIDE_WINDOW_QUERY } from '@/lib/useWideWindow'

/**
 * Stubs `matchMedia` so that only the given `queries` match. Every other query, such as reduced motion or
 * `(hover: none)`, does not. Undo it with `vi.unstubAllGlobals()`.
 */
export function stubMedia(...queries: string[]): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: queries.includes(query),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

/**
 * Stubs `matchMedia` as a wide window with a mouse (`useWideHover()` is true): the shops' Cardmaker then stands in the
 * corner and speaks.
 */
export function stubWideHover(): void {
  stubMedia(WIDE_HOVER_QUERY)
}

/**
 * Stubs `matchMedia` as a wide window (`useWideWindow()` is true): the hand then shows the selected card's or word's
 * details in a panel beside it.
 */
export function stubWideWindow(): void {
  stubMedia(WIDE_WINDOW_QUERY)
}

import { vi } from 'vitest'

import { WIDE_HOVER_QUERY } from '@/lib/useWideHover'

/**
 * Stubs `matchMedia` as a wide window with a mouse (`useWideHover()` is true): the shops' Cardmaker then stands in the
 * corner and speaks. Every other query, such as reduced motion or `(hover: none)`, does not match. Undo it with
 * `vi.unstubAllGlobals()`.
 */
export function stubWideHover(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === WIDE_HOVER_QUERY,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

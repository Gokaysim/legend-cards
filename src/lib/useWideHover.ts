import { useMediaQuery } from './useMediaQuery'

/**
 * A device with hover whose window is at least `lg` (64rem, where the sidebar layout begins): a desktop or laptop
 * window with a mouse. Phones, tablets and narrow windows do not match.
 */
export const WIDE_HOVER_QUERY = '(hover: hover) and (min-width: 64rem)'

/**
 * True on a wide window with a mouse, live (design D1). It places the shops' Cardmaker in the bottom-right corner and
 * turns on her speech bubbles. Where the browser cannot tell (no `matchMedia`), it is false, so she stays by the title.
 */
export function useWideHover(): boolean {
  return useMediaQuery(WIDE_HOVER_QUERY)
}

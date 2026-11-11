import { useMediaQuery } from './useMediaQuery'

/**
 * A window at least `lg` (64rem, where the sidebar layout begins), with or without hover: a desktop, a laptop, or a
 * tablet held sideways.
 */
export const WIDE_WINDOW_QUERY = '(min-width: 64rem)'

/**
 * True on a wide window, live. The hand screen then shows the selected card's or word's details in a panel beside the
 * hand instead of a dialog (spec: card-holdings, "Card details beside the hand"). Where the browser cannot tell (no
 * `matchMedia`), it is false, so the details open in a dialog.
 */
export function useWideWindow(): boolean {
  return useMediaQuery(WIDE_WINDOW_QUERY)
}

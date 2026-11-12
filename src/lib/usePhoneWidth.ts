import { useMediaQuery } from './useMediaQuery'

/** A window narrower than `sm` (40rem, 640 px): a phone, or a very narrow window. */
export const PHONE_WIDTH_QUERY = '(width < 40rem)'

/**
 * True on a window narrower than 640 CSS pixels, live (spec: card-images, "The Cardmaker on screens"; design D5 of
 * `polish-cards-packs-and-mascots`). No Cardmaker shows there. Where the browser cannot tell (no `matchMedia`), it is
 * false, so the Cardmaker keeps her place.
 */
export function usePhoneWidth(): boolean {
  return useMediaQuery(PHONE_WIDTH_QUERY)
}

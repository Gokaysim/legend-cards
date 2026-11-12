import type { ArtLookup } from './artContext'

/**
 * The back every face-down card of one spread shows (design D7). It comes from the spread, never from the card under
 * it, so a back never gives a card away:
 * - `neutral`: the back drawn without a picture, for a random draw and a Golden Pack, whose cards can be of any set,
 *   Blessed included
 * - `cursed`: the Cursed cardback, for a Cursed draw and the Cursed types of pack
 * - `set`: the set's cardback, for its Standard, Premium and Pandemonium Pack
 * - `pack`: a pack's own picture by its manifest key, for a Mechanic Pack (`mechanic:<name>`)
 */
export type SpreadBack =
  | { kind: 'neutral' }
  | { kind: 'cursed' }
  | { kind: 'set'; setCode: string }
  | { kind: 'pack'; packKey: string }

export const NEUTRAL_BACK: SpreadBack = { kind: 'neutral' }
export const CURSED_BACK: SpreadBack = { kind: 'cursed' }

/**
 * The picture of a spread's back, or `null` for the CSS back: always for `neutral`, and when the cardback or the pack
 * has no picture. A set or a pack without one falls back to the neutral back, the Cursed back to its CSS look.
 */
export function spreadBackUrl(art: ArtLookup, back: SpreadBack): string | null {
  switch (back.kind) {
    case 'neutral':
      return null
    case 'cursed':
      return art.backUrl('cursed')
    case 'set':
      return art.backUrl(back.setCode)
    case 'pack':
      return art.packUrl(back.packKey)
  }
}

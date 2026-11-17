import type { Card } from '@/features/cards/schema'

import type { ArtLookup } from './artContext'

/**
 * The back a face-down card shows (spec: card-images, "Cardbacks of face-down cards"). Most spreads give every card
 * the same back; a random draw and a Golden Pack give each card its own (`cardBack`, design D1 of
 * `show-set-art-on-draws-and-library`):
 * - `neutral`: the back drawn without a picture, for the deck of a draw without a set filter, a Golden Pack's
 *   card not yet loaded, and a card without a set
 * - `cursed`: the Cursed cardback, for a Cursed draw, the Cursed types of pack and a Cursed card
 * - `blessed`: the Blessed cardback, for a Blessed card in a random draw or a Golden Pack
 * - `set`: the set's cardback, for its Standard, Premium and Pandemonium Pack, and for a card of the set
 * - `pack`: a pack's own picture by its manifest key, for a Mechanic Pack (`mechanic:<name>`)
 */
export type SpreadBack =
  | { kind: 'neutral' }
  | { kind: 'cursed' }
  | { kind: 'blessed' }
  | { kind: 'set'; setCode: string }
  | { kind: 'pack'; packKey: string }

export const NEUTRAL_BACK: SpreadBack = { kind: 'neutral' }
export const CURSED_BACK: SpreadBack = { kind: 'cursed' }
export const BLESSED_BACK: SpreadBack = { kind: 'blessed' }

/**
 * A card's own back, for a random draw and a Golden Pack: the Blessed cardback for a Blessed card, the Cursed one for
 * a Cursed card, its set's cardback for a card of a set, and the neutral back for a card without a set.
 */
export function cardBack(card: Pick<Card, 'kind' | 'setCode'>): SpreadBack {
  if (card.kind === 'blessed') return BLESSED_BACK
  if (card.kind === 'cursed') return CURSED_BACK
  return card.setCode === null ? NEUTRAL_BACK : { kind: 'set', setCode: card.setCode }
}

/**
 * The picture of a back, or `null` for the CSS back: always for `neutral`, and when the cardback or the pack has no
 * picture. A set, the Blessed back or a pack without one falls back to the neutral back, the Cursed back to its CSS
 * look.
 */
export function spreadBackUrl(art: ArtLookup, back: SpreadBack): string | null {
  switch (back.kind) {
    case 'neutral':
      return null
    case 'cursed':
      return art.backUrl('cursed')
    case 'blessed':
      return art.backUrl('blessed')
    case 'set':
      return art.backUrl(back.setCode)
    case 'pack':
      return art.packUrl(back.packKey)
  }
}

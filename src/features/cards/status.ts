import { NO_VALUE } from './display'
import type { Card } from './schema'

/** The short name of a DM-only card (spec: definition-editing, "DM-only cards"). */
export const DM_ONLY_LABEL = "DM'e özel"

/** The mark of a DM-only card on the DM's card faces and list rows. */
export const DM_ONLY_MARK = '🔒 DM'

/** Where a card is: in the pool, in hands, or both. The card-holdings feature computes it. */
export type CardStatus = {
  /**
   * An active normal card without a holder, or an active Blessed card (always in the pool). Cursed cards, drafts,
   * retired cards and DM-only cards: never.
   */
  inPool: boolean
  /** The names of everyone holding a copy, each once. */
  holderNames: readonly string[]
}

/** The status of a deck's cards, and its counts. */
export type DeckStatus = {
  byCard: ReadonlyMap<string, CardStatus>
  /** The cards in the pool: normal cards without a holder, plus Blessed cards. */
  poolCount: number
  /** The copies of the deck's cards in hands. */
  handCount: number
}

/**
 * The Durum text: "Havuzda", "Elde: Ayla, Bora", "Havuzda · Elde: Ayla" for a card in the pool that someone holds
 * a copy of (a Blessed card, or a DM's extra copy), and for a Cursed card, a draft or a retired card the names of its
 * holders or "—". A DM-only card is "DM'e özel", or "DM'e özel · Elde: Ayla" (spec: card-library, "Pool status in the
 * library").
 */
export function statusLabel(card: Pick<Card, 'kind' | 'dmOnly'>, status: CardStatus): string {
  const names = status.holderNames.join(', ')
  if (card.dmOnly) return names ? `${DM_ONLY_LABEL} · Elde: ${names}` : DM_ONLY_LABEL
  if (card.kind === 'cursed' || !status.inPool) return names ? `Elde: ${names}` : NO_VALUE
  return names ? `Havuzda · Elde: ${names}` : 'Havuzda'
}

/** True when the card face gets the "Elde" mark: a card out of the pool, or a Cursed card, that someone holds. */
export function isMarkedHeld(card: Pick<Card, 'kind'>, status: CardStatus): boolean {
  return (card.kind === 'cursed' || !status.inPool) && status.holderNames.length > 0
}

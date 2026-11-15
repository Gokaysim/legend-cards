import { NO_VALUE } from './display'
import { hasChannel } from './pool'
import type { Card } from './schema'

/**
 * The Durum of a card that only the DM gives: none of its channel flags is on (spec: card-library, "Pool status in the
 * library").
 */
export const DM_ONLY_LABEL = "DM'e özel"

/**
 * The mark of a card or True Word whose "Listede görünür" is off, on the DM's faces, list rows and status filter (spec:
 * card-library, "Cards not listed for players").
 */
export const DM_ONLY_MARK = '🔒 DM'

/** Where a card is: in the pool, in hands, or both. The card-holdings feature computes it. */
export type CardStatus = {
  /**
   * An active normal or Blessed card that a draw or a pack can give and that no one holds as its one copy (`isInPool`).
   * Cursed cards, drafts, retired cards and cards without a channel: never.
   */
  inPool: boolean
  /** The names of everyone holding a copy, each once. */
  holderNames: readonly string[]
}

/** The status of a deck's cards, and its counts. */
export type DeckStatus = {
  byCard: ReadonlyMap<string, CardStatus>
  /** The cards in the pool. */
  poolCount: number
  /** The copies of the deck's cards in hands. */
  handCount: number
}

/**
 * The Durum text: "Havuzda", "Elde: Ayla, Bora", "Havuzda · Elde: Ayla" for a card in the pool that someone holds
 * a copy of (a repeatable card, or a DM's extra copy), and for a Cursed card, a draft or a retired card the names of
 * its holders or "—". A card without a channel is "DM'e özel", or "DM'e özel · Elde: Ayla" (spec: card-library, "Pool
 * status in the library").
 */
export function statusLabel(
  card: Pick<Card, 'kind' | 'isInDraws' | 'isInSetPacks' | 'isInMechanicPacks'>,
  status: CardStatus,
): string {
  const names = status.holderNames.join(', ')
  if (!hasChannel(card)) return names ? `${DM_ONLY_LABEL} · Elde: ${names}` : DM_ONLY_LABEL
  if (card.kind === 'cursed' || !status.inPool) return names ? `Elde: ${names}` : NO_VALUE
  return names ? `Havuzda · Elde: ${names}` : 'Havuzda'
}

/** True when the card face gets the "Elde" mark: a card out of the pool, or a Cursed card, that someone holds. */
export function isMarkedHeld(card: Pick<Card, 'kind'>, status: CardStatus): boolean {
  return (card.kind === 'cursed' || !status.inPool) && status.holderNames.length > 0
}

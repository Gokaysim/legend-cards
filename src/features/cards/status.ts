import { NO_VALUE } from './display'
import type { Card } from './schema'

/** Where a card is: in the pool, in hands, or both. The card-holdings feature computes it. */
export type CardStatus = {
  /** A normal card without a holder, or a Blessed card (always in the pool). Cursed cards: never. */
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
 * a copy of (a Blessed card, or a DM's extra copy), and for a Cursed card the names of its holders or "—".
 */
export function statusLabel(card: Pick<Card, 'kind'>, status: CardStatus): string {
  const names = status.holderNames.join(', ')
  if (card.kind === 'cursed') return names ? `Elde: ${names}` : NO_VALUE
  if (!status.inPool) return `Elde: ${names}`
  return names ? `Havuzda · Elde: ${names}` : 'Havuzda'
}

/** True when the card face gets the "Elde" mark: a held normal card, or a Cursed card someone holds. */
export function isMarkedHeld(card: Pick<Card, 'kind'>, status: CardStatus): boolean {
  return card.kind === 'cursed' ? status.holderNames.length > 0 : !status.inPool
}

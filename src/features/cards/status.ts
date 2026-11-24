import { NO_VALUE } from './display'
import { hasChannel } from './pool'
import type { Definition } from './schema'

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

/**
 * Where a card is: in the pool, in hands, or both. The card-holdings feature computes it for cards, and the true-words
 * feature for True Words, whose holders are the players who know them (`wordStatuses`).
 */
export type CardStatus = {
  /**
   * An active normal or Blessed card that a draw or a pack can give and that no one holds as its one copy (`isInPool`).
   * Cursed cards, True Words, drafts, retired cards and cards without a channel: never.
   */
  inPool: boolean
  /** The names of everyone holding a copy, or for a True Word everyone who knows it, each once. */
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
 * status in the library"). A True Word names those who know it as "Bilenler: Ayla, Bora", and is "DM'e özel" when
 * "Draft'ta çıkar", its only channel, is off (spec: card-library, "Durum of a True Word").
 */
export function statusLabel(
  card: Pick<Definition, 'kind' | 'isInDraws' | 'isInSetPacks' | 'isInMechanicPacks'>,
  status: CardStatus,
): string {
  const names = status.holderNames.join(', ')
  const holders = card.kind === 'trueWord' ? 'Bilenler' : 'Elde'
  // A Custom Card is made for one hand and is never in a pool or given by the DM from a list.
  if (card.kind === 'custom') return names ? `${holders}: ${names}` : NO_VALUE
  if (!hasChannel(card)) return names ? `${DM_ONLY_LABEL} · ${holders}: ${names}` : DM_ONLY_LABEL
  if (card.kind === 'cursed' || !status.inPool) return names ? `${holders}: ${names}` : NO_VALUE
  return names ? `Havuzda · Elde: ${names}` : 'Havuzda'
}

/**
 * True when the card face gets the "Elde" mark: a card out of the pool, or a Cursed card, that someone holds. A True
 * Word never does: knowing a word is not holding a card (spec: visual-effects, "Held cards glow in the library").
 */
export function isMarkedHeld(card: Pick<Definition, 'kind'>, status: CardStatus): boolean {
  if (card.kind === 'trueWord') return false
  return (card.kind === 'cursed' || !status.inPool) && status.holderNames.length > 0
}

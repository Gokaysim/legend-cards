import type { Card } from './schema'
import { setDisplayName } from './sets'
import { matchesAllTerms, normalize, searchTerms } from './text'

/** Shown where a card has no value, for example the cost of a Blessed card. */
export const NO_VALUE = '—'

const NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/

/** A cost as a number when it is written as one ("3", "-1", "1,5"); `null` for "X", "d6", or no cost. */
export function numericCost(cost: string | null): number | null {
  const value = cost?.trim() ?? ''
  return NUMBER_PATTERN.test(value) ? Number(value.replace(',', '.')) : null
}

/**
 * How a hand's cost compares with the card's own cost: `lower`, `higher`, or `null` when they are equal or
 * either is not a number.
 */
export function costChange(
  cardCost: string | null,
  handCost: string | null,
): 'lower' | 'higher' | null {
  const base = numericCost(cardCost)
  const current = numericCost(handCost)
  if (base === null || current === null || base === current) return null
  return current < base ? 'lower' : 'higher'
}

/** The frame a card gets, after the Kurallar table rules: purple Common, gold Rare, white Blessed, red Cursed. */
export type CardFrame = 'common' | 'rare' | 'blessed' | 'cursed'

export function cardFrame(card: Card): CardFrame {
  return card.kind === 'normal' ? card.rarity : card.kind
}

/**
 * How a card face glows (spec: visual-effects): an active card in a hand by its kind, the selected card of a hand
 * whose details show beside it gold, a revealed card in a draw or a pack by its kind, a card someone holds in the
 * library soft gold, or not at all.
 */
export type FaceGlow =
  | 'active'
  | 'active-cursed'
  | 'active-blessed'
  | 'selected'
  | 'reveal-common'
  | 'reveal-rare'
  | 'reveal-cursed'
  | 'reveal-blessed'
  | 'held'

/**
 * The face's glow, in this order: its active state, its selection, its reveal, its holders. An active card keeps its
 * active glow when it is selected (design D4 of `add-visual-effects` and of `align-hand-screen-with-v2-2-8`).
 */
export function faceGlow(
  frame: CardFrame,
  state: { isActive: boolean; isSelected?: boolean; isRevealed: boolean; isHeld: boolean },
): FaceGlow | null {
  if (state.isActive) {
    return frame === 'cursed' ? 'active-cursed' : frame === 'blessed' ? 'active-blessed' : 'active'
  }
  if (state.isSelected) return 'selected'
  if (state.isRevealed) return `reveal-${frame}`
  return state.isHeld ? 'held' : null
}

/** The kind word shown and searched for Blessed and Cursed cards. Normal cards have none. */
export function kindLabel(card: Pick<Card, 'kind'>): string | null {
  return card.kind === 'blessed' ? 'Blessed' : card.kind === 'cursed' ? 'Cursed' : null
}

/** The set as shown: the official name, "Blessed" for Blessed cards, nothing for Cursed cards. */
export function setLabel(card: Pick<Card, 'kind' | 'setCode'>): string | null {
  if (card.kind === 'blessed') return 'Blessed'
  return card.setCode === null ? null : setDisplayName(card.setCode)
}

/** "Common", "Rare", or nothing. */
export function rarityLabel(card: Pick<Card, 'rarity'>): string | null {
  return card.rarity === 'common' ? 'Common' : card.rarity === 'rare' ? 'Rare' : null
}

/**
 * Everything a search looks in, normalized once per card: name, set code and official name, cost, rarity,
 * mechanic pack, the raw text with its bracket metadata, and the kind word of Blessed and Cursed cards.
 */
export function cardHaystack(card: Card): string {
  return normalize(
    [
      card.name,
      card.setCode,
      setLabel(card),
      card.cost,
      rarityLabel(card),
      card.mechanicPack,
      card.text,
      kindLabel(card),
    ]
      .filter((part) => part !== null)
      .join(' '),
  )
}

/** True when the card matches every comma- or semicolon-separated term of the query (spec: Card search). */
export function cardMatchesQuery(haystack: string, query: string): boolean {
  return matchesAllTerms(haystack, searchTerms(query))
}

/**
 * The zoom view's line under the card's name (spec: Zoom view contents): the set, or "Blessed" or "Cursed", then
 * "Cost <cost>", then the rarity, joined by " · ". A missing cost or rarity is left out. Opened from a hand whose
 * cost differs from the card's own (`handCost`), the cost reads "Cost <hand cost> (temel: <own cost or —>)".
 */
export function zoomLine(card: Card, handCost?: string | null): string {
  const set = card.kind === 'cursed' ? 'Cursed' : setLabel(card)
  const cost =
    handCost !== undefined && handCost !== card.cost
      ? `Cost ${handCost ?? NO_VALUE} (temel: ${card.cost ?? NO_VALUE})`
      : card.cost === null
        ? null
        : `Cost ${card.cost}`
  return [set, cost, rarityLabel(card)].filter((part) => part !== null).join(' · ')
}

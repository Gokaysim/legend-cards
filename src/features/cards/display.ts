import type { Definition } from './schema'
import { matchesAllTerms, normalize, searchTerms } from './text'

/**
 * How a set code is shown: its stored set's official name, or the code as written (`useSetIndex().setName`, spec:
 * card-library, "Official set names").
 */
export type SetName = (setCode: string) => string

/** Every set code as written: for code that shows no set names, and for tests. */
export const AS_WRITTEN: SetName = (setCode) => setCode

/** Shown where a card has no value, for example the cost of a Blessed card. */
export const NO_VALUE = '—'

const NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/

/** A cost as a number when it is written as one ("3", "-1", "1,5"); `null` for "X", "d6", or no cost. */
export function numericCost(cost: string | null): number | null {
  const value = cost?.trim() ?? ''
  return NUMBER_PATTERN.test(value) ? Number(value.replace(',', '.')) : null
}

/**
 * What using a card or a True Word asks the user to pay, read from its cost as written (spec: card-holdings, "The
 * price of a use"; design D3 of `pay-lp-on-use`):
 * - `fixed`: exactly `amount` LP. A cost of whole digits ("2"), or no cost at all (0).
 * - `die`: "d6". The user enters the die rolled at the table, 1 to 6.
 * - `chosen`: anything else ("X", "X+1", "-1", "1,5"). The user enters a whole number of LP from 0 up.
 *
 * Unlike `numericCost`, "-1" and "1,5" are not fixed prices: LP is a whole number, never below 0.
 * Keep in step with `priceAllows` in `firestore.rules`.
 */
export type UsePrice = { kind: 'fixed'; amount: number } | { kind: 'die' } | { kind: 'chosen' }

/** The sides of the die a "d6" cost rolls. */
export const DIE_SIDES = 6

/** The most LP one use may take. Keep in step with the ledger's limit in `firestore.rules`. */
export const MAX_USE_AMOUNT = 1_000_000

export function priceOfUse(cost: string | null): UsePrice {
  const value = cost?.trim() ?? ''
  if (value === '') return { kind: 'fixed', amount: 0 }
  if (/^\d+$/.test(value)) return { kind: 'fixed', amount: Number(value) }
  if (value.toLowerCase() === 'd6') return { kind: 'die' }
  return { kind: 'chosen' }
}

/** True when a player may pay `amount` LP for a use at `price`, as the rules' `priceAllows` accepts it. */
export function priceAllows(price: UsePrice, amount: number): boolean {
  if (!Number.isInteger(amount)) return false
  switch (price.kind) {
    case 'fixed':
      return amount === price.amount
    case 'die':
      return amount >= 1 && amount <= DIE_SIDES
    case 'chosen':
      return amount >= 0 && amount <= MAX_USE_AMOUNT
  }
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

/**
 * The frame a face gets, after the Kurallar table rules: purple Common, gold Rare, white Blessed, red Cursed, and the
 * True Words color for a True Word in the Kütüphane (spec: card-library, "Card view").
 */
export type CardFrame = 'common' | 'rare' | 'blessed' | 'cursed' | 'word'

export function cardFrame(card: Pick<Definition, 'kind' | 'rarity'>): CardFrame {
  if (card.kind === 'trueWord') return 'word'
  // A normal draft may have no rarity yet: it gets the Common frame until it does.
  return card.kind === 'normal' ? (card.rarity ?? 'common') : card.kind
}

/** True when a face shows a set, a rarity and a mechanic pack: not for a Cursed card or a True Word. */
export function hasSetDetails(card: Pick<Definition, 'kind'>): boolean {
  return card.kind !== 'cursed' && card.kind !== 'trueWord'
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
  // A True Word is never drawn or shown in a pack, so it has no reveal glow.
  if (state.isRevealed && frame !== 'word') return `reveal-${frame}`
  return state.isHeld ? 'held' : null
}

/** The kind word shown and searched for Blessed and Cursed cards. Normal cards have none. */
export function kindLabel(card: Pick<Definition, 'kind'>): string | null {
  return card.kind === 'blessed' ? 'Blessed' : card.kind === 'cursed' ? 'Cursed' : null
}

/** The set as shown: the official name, "Blessed" for Blessed cards, nothing for Cursed cards and True Words. */
export function setLabel(
  card: Pick<Definition, 'kind' | 'setCode'>,
  setName: SetName,
): string | null {
  if (card.kind === 'blessed') return 'Blessed'
  return card.setCode === null ? null : setName(card.setCode)
}

/** "Common", "Rare", or nothing. */
export function rarityLabel(card: Pick<Definition, 'rarity'>): string | null {
  return card.rarity === 'common' ? 'Common' : card.rarity === 'rare' ? 'Rare' : null
}

/**
 * Everything a search looks in, normalized once per card or True Word: name, set code and official name, cost, rarity,
 * mechanic pack, the raw text with its bracket metadata, and the kind word of Blessed and Cursed cards.
 */
export function cardHaystack(card: Definition, setName: SetName): string {
  return normalize(
    [
      card.name,
      card.setCode,
      setLabel(card, setName),
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

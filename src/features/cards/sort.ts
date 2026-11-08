import { numericCost, rarityLabel, setLabel } from './display'
import type { Card } from './schema'
import { visibleText } from './text'

/** The list columns a user can sort by. */
export type SortKey = 'name' | 'set' | 'cost' | 'rarity' | 'mechanicPack' | 'text' | 'status'

/** The Durum text of a card, from its pool status; `null` when it is not known (yet). */
export type StatusText = (card: Card) => string | null

const NO_STATUS: StatusText = () => null
export type SortDirection = 'asc' | 'desc'
export type CardSort = { key: SortKey; direction: SortDirection }

/** The order a list starts in. */
export const DEFAULT_SORT: CardSort = { key: 'name', direction: 'asc' }

/** Turkish alphabetical order, with numbers inside text in numeric order ("2" before "10"). */
const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })

/** The value a column sorts by: what the column shows. `null` when the card has no value there. */
function sortValue(card: Card, key: SortKey, statusText: StatusText): string | null {
  switch (key) {
    case 'name':
      return card.name
    case 'set':
      return setLabel(card)
    case 'cost':
      return card.cost
    case 'rarity':
      return rarityLabel(card)
    case 'mechanicPack':
      return card.mechanicPack
    case 'text':
      return visibleText(card.text)
    case 'status':
      return statusText(card)
  }
}

/**
 * Compares two cards for the list (spec: List sorting). Two numeric costs compare as numbers; other values
 * with the Turkish collator. Cards without a value come last in both directions, and ties go by name.
 */
export function compareCards(
  a: Card,
  b: Card,
  { key, direction }: CardSort,
  statusText: StatusText = NO_STATUS,
): number {
  const left = sortValue(a, key, statusText)
  const right = sortValue(b, key, statusText)
  if (left === null || right === null) {
    if (left !== right) return left === null ? 1 : -1
  } else {
    const leftNumber = key === 'cost' ? numericCost(left) : null
    const rightNumber = key === 'cost' ? numericCost(right) : null
    const result =
      leftNumber !== null && rightNumber !== null
        ? leftNumber - rightNumber
        : collator.compare(left, right)
    if (result !== 0) return direction === 'asc' ? result : -result
  }
  return collator.compare(a.name, b.name) || a.id.localeCompare(b.id)
}

/** A sorted copy. `statusText` gives the Durum column's values. */
export function sortCards(
  cards: readonly Card[],
  sort: CardSort,
  statusText: StatusText = NO_STATUS,
): Card[] {
  return [...cards].sort((a, b) => compareCards(a, b, sort, statusText))
}

/** Compares two names or labels the way the lists do, for building filter options. */
export function compareLabels(a: string, b: string): number {
  return collator.compare(a, b)
}

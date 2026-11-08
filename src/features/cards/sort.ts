import { rarityLabel, setLabel } from './display'
import type { Card } from './schema'
import { visibleText } from './text'

/** The list columns a user can sort by. */
export type SortKey = 'name' | 'set' | 'cost' | 'rarity' | 'mechanicPack' | 'text'
export type SortDirection = 'asc' | 'desc'
export type CardSort = { key: SortKey; direction: SortDirection }

/** The order a list starts in. */
export const DEFAULT_SORT: CardSort = { key: 'name', direction: 'asc' }

/** Turkish alphabetical order, with numbers inside text in numeric order ("2" before "10"). */
const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })

const NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/
const asNumber = (value: string) => Number(value.replace(',', '.'))

/** The value a column sorts by: what the column shows. `null` when the card has no value there. */
function sortValue(card: Card, key: SortKey): string | null {
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
  }
}

/**
 * Compares two cards for the list (spec: List sorting). Two numeric costs compare as numbers; other values
 * with the Turkish collator. Cards without a value come last in both directions, and ties go by name.
 */
export function compareCards(a: Card, b: Card, { key, direction }: CardSort): number {
  const left = sortValue(a, key)
  const right = sortValue(b, key)
  if (left === null || right === null) {
    if (left !== right) return left === null ? 1 : -1
  } else {
    const result =
      key === 'cost' && NUMBER_PATTERN.test(left) && NUMBER_PATTERN.test(right)
        ? asNumber(left) - asNumber(right)
        : collator.compare(left, right)
    if (result !== 0) return direction === 'asc' ? result : -result
  }
  return collator.compare(a.name, b.name) || a.id.localeCompare(b.id)
}

/** A sorted copy. */
export function sortCards(cards: readonly Card[], sort: CardSort): Card[] {
  return [...cards].sort((a, b) => compareCards(a, b, sort))
}

/** Compares two names or labels the way the lists do, for building filter options. */
export function compareLabels(a: string, b: string): number {
  return collator.compare(a, b)
}

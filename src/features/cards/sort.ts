import { AS_WRITTEN, numericCost, rarityLabel, type SetName, setLabel } from './display'
import type { Definition } from './schema'
import { visibleText } from './text'

/** The list columns a user can sort by. */
export type SortKey = 'name' | 'set' | 'cost' | 'rarity' | 'mechanicPack' | 'text' | 'status'

/** The Durum text of a card or True Word, from its status; `null` when it is not known (yet). */
export type StatusText = (card: Definition) => string | null

const NO_STATUS: StatusText = () => null
export type SortDirection = 'asc' | 'desc'
export type CardSort = { key: SortKey; direction: SortDirection }

/** The order a list starts in. */
export const DEFAULT_SORT: CardSort = { key: 'name', direction: 'asc' }

/** Turkish alphabetical order, with numbers inside text in numeric order ("2" before "10"). */
const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })

/** The value a column sorts by: what the column shows. `null` when the card has no value there. */
function sortValue(
  card: Definition,
  key: SortKey,
  statusText: StatusText,
  setName: SetName,
): string | null {
  switch (key) {
    case 'name':
      return card.name
    case 'set':
      return setLabel(card, setName)
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
  a: Definition,
  b: Definition,
  { key, direction }: CardSort,
  statusText: StatusText = NO_STATUS,
  setName: SetName = AS_WRITTEN,
): number {
  const left = sortValue(a, key, statusText, setName)
  const right = sortValue(b, key, statusText, setName)
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

/** A sorted copy. `statusText` gives the Durum column's values, and `setName` the Set column's. */
export function sortCards<T extends Definition>(
  cards: readonly T[],
  sort: CardSort,
  statusText: StatusText = NO_STATUS,
  setName: SetName = AS_WRITTEN,
): T[] {
  return [...cards].sort((a, b) => compareCards(a, b, sort, statusText, setName))
}

/** Compares two names or labels the way the lists do, for building filter options. */
export function compareLabels(a: string, b: string): number {
  return collator.compare(a, b)
}

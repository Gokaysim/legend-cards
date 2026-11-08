import type { Card } from './schema'
import { setDisplayName } from './sets'
import { matchesAllTerms, normalize, searchTerms } from './text'

/** Shown where a card has no value, for example the cost of a Blessed card. */
export const NO_VALUE = '—'

/** The frame a card gets, after the Kurallar table rules: purple Common, gold Rare, white Blessed, red Cursed. */
export type CardFrame = 'common' | 'rare' | 'blessed' | 'cursed'

export function cardFrame(card: Card): CardFrame {
  return card.kind === 'normal' ? card.rarity : card.kind
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

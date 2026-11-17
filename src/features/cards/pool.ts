import { numericCost, rarityLabel, type SetName, setLabel } from './display'
import type { Card, Definition, TrueWord } from './schema'
import { compareLabels } from './sort'

// The pool as draws, packs and drafts see it, computed from the definitions alone (design D3 of
// unify-cards-and-true-words): the behavior flags say which channels a definition is in, and the `holder` of a card
// with one copy says whether it is out of the pool. Every consumer goes through these helpers, so no screen re-derives
// a rule. The library's Durum (`hands/cardStatus.ts`) also names holders, so it reads the holdings for those.

/** The rarities a draw can be narrowed to. `blessed` means the Blessed kind, which has no rarity of its own. */
export const DRAW_RARITIES = ['common', 'rare', 'blessed'] as const
export type DrawRarity = (typeof DRAW_RARITIES)[number]

/** The DM's filters for a random draw. `null` leaves that filter out. */
export type DrawFilters = {
  /** The set's code: the stored set's own code, or the card's code as written when no stored set has it. */
  setCode: string | null
  /** The written cost, compared trimmed and ignoring case. */
  cost: string | null
  mechanicPack: string | null
  rarity: DrawRarity | null
  /** Matched as the library search matches. */
  keyword: string | null
}

/** No filter set: the whole pool. */
export const NO_FILTERS: DrawFilters = {
  setCode: null,
  cost: null,
  mechanicPack: null,
  rarity: null,
  keyword: null,
}

/**
 * True when the definition is in play and not out of the pool: active, and either repeatable or without a holder of
 * its one copy (spec: card-holdings, "Cards with one copy leave the pool while held").
 */
export function isAvailable(
  definition: Pick<Definition, 'status' | 'isRepeatable' | 'holder'>,
): boolean {
  return definition.status === 'active' && (definition.isRepeatable || definition.holder === null)
}

/**
 * True for a card a random draw can give: an available normal or Blessed card whose "Kart çekmede çıkar" is on (spec:
 * card-draws, "Equal chance from the pool").
 */
export function inRandomDraw(card: Card): boolean {
  return (card.kind === 'normal' || card.kind === 'blessed') && card.isInDraws && isAvailable(card)
}

/**
 * True for a card of the Cursed Deck: an available Cursed card whose "Cursed Deck'te çıkar" is on (spec: card-draws,
 * "Cursed draw"). A Cursed draw and a Cursed pack's mandatory card come from it.
 */
export function inCursedDeck(card: Card): boolean {
  return card.kind === 'cursed' && card.isInDraws && isAvailable(card)
}

/** True for an available card whose "Set paketlerinde çıkar" is on (spec: pack-shop, "Packs follow the pack flags"). */
export function inSetPacks(card: Card): boolean {
  return card.isInSetPacks && isAvailable(card)
}

/** True for an available card whose "Mechanic paketlerinde çıkar" is on. The Golden Packs use it too. */
export function inMechanicPacks(card: Card): boolean {
  return card.isInMechanicPacks && isAvailable(card)
}

/** True when a draw or a pack can give the card: at least one channel flag is on. Off everywhere is "DM'e özel". */
export function hasChannel(
  card: Pick<Card, 'isInDraws' | 'isInSetPacks' | 'isInMechanicPacks'>,
): boolean {
  return card.isInDraws || card.isInSetPacks || card.isInMechanicPacks
}

/**
 * True for a card in the pool, as the library's Durum, its pool count and "Yalnızca havuzdakiler" see it (spec:
 * card-library, "Pool status in the library"): available, and with a channel.
 */
export function isInPool(card: Card): boolean {
  return isAvailable(card) && hasChannel(card)
}

/**
 * True for a word a draft for a player who knows `known` can show: active, with "Draft'ta çıkar" on, and not known
 * (spec: true-words, "Starting a draft").
 */
export function inWordDraft(word: TrueWord, known: ReadonlySet<string>): boolean {
  return word.status === 'active' && word.isInDraws && !known.has(word.id)
}

/** The cards a random draw picks from. */
export function drawablePool(cards: readonly Card[]): Card[] {
  return cards.filter(inRandomDraw)
}

/** The Cursed Deck: the cards a Cursed draw and a pack's Cursed card pick from. */
export function cursedPool(cards: readonly Card[]): Card[] {
  return cards.filter(inCursedDeck)
}

/** A card's rarity for the draw filter: its rarity, `blessed` for a Blessed card, and none for a Cursed card. */
export function drawRarity(card: Pick<Definition, 'kind' | 'rarity'>): DrawRarity | null {
  return card.kind === 'blessed' ? 'blessed' : card.rarity
}

/** A written cost as filters compare it: trimmed and in lower case, or `null` without a cost. */
export const costKey = (cost: string | null) => cost?.trim().toLowerCase() || null

/** How filters find a card's set: by its official name, and by the stored set its code or an alias names. */
export type SetLookup = {
  setName: SetName
  setOf: (code: string) => { code: string } | undefined
}

/** The code a set filter stores for a card's set: the stored set's own code, or the code as written. */
export function setFilterCode(setCode: string, sets: SetLookup): string {
  return sets.setOf(setCode)?.code ?? setCode.trim()
}

/** The filters to store with a draw: blank values dropped, and `null` when no filter is left. */
export function activeFilters(filters: DrawFilters): DrawFilters | null {
  const text = (value: string | null) => value?.trim() || null
  const active: DrawFilters = {
    setCode: text(filters.setCode),
    cost: text(filters.cost),
    mechanicPack: text(filters.mechanicPack),
    rarity: filters.rarity,
    keyword: text(filters.keyword),
  }
  return Object.values(active).some((value) => value !== null) ? active : null
}

/** Costs as the filters order them: numbers first in numeric order, then the others ("X", "d6") alphabetically. */
export function compareCosts(a: string, b: string): number {
  const left = numericCost(a)
  const right = numericCost(b)
  if (left !== null && right !== null) return left - right
  if (left !== null || right !== null) return left !== null ? -1 : 1
  return compareLabels(a, b)
}

/** A count and its share of the pool, formatted in Turkish ("%71,4"). */
export type PoolShare = { label: string; count: number; share: string }

/** A rarity's share, with how many of its cards come from each set. */
export type RarityShare = PoolShare & { sets: { label: string; count: number }[] }

export type PoolDistribution = {
  /** How many cards a random draw can give. */
  total: number
  /** Common, Rare and Blessed, most cards first. */
  rarities: RarityShare[]
  /** Each set by its official name, and "Blessed", most cards first. */
  sets: PoolShare[]
}

const percent = new Intl.NumberFormat('tr', { style: 'percent', maximumFractionDigits: 1 })

/** Most cards first, then by name. */
function byCount<T extends { label: string; count: number }>(a: T, b: T): number {
  return b.count - a.count || compareLabels(a.label, b.label)
}

function countBy<K>(items: readonly K[]): Map<K, number> {
  const counts = new Map<K, number>()
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
  return counts
}

/**
 * The pool by rarity and by set, over the drawable cards. Every drawable card has the same chance in a random
 * draw, so the shares are also the odds. A Blessed card counts as the rarity and the set "Blessed".
 */
export function poolDistribution(cards: readonly Card[], setName: SetName): PoolDistribution {
  const pool = drawablePool(cards)
  const total = pool.length
  const share = (count: number) => percent.format(count / total)
  const rarityOf = (card: Card) => rarityLabel(card) ?? 'Blessed'
  const setOf = (card: Card) => setLabel(card, setName) ?? 'Blessed'

  const rarities = [...countBy(pool.map(rarityOf))].map(([label, count]) => ({
    label,
    count,
    share: share(count),
    sets: [...countBy(pool.filter((card) => rarityOf(card) === label).map(setOf))]
      .map(([set, setCount]) => ({ label: set, count: setCount }))
      .sort(byCount),
  }))
  const sets = [...countBy(pool.map(setOf))].map(([label, count]) => ({
    label,
    count,
    share: share(count),
  }))
  return { total, rarities: rarities.sort(byCount), sets: sets.sort(byCount) }
}

import { cardHaystack, cardMatchesQuery, numericCost, rarityLabel, setLabel } from './display'
import type { Card } from './schema'
import { compareLabels } from './sort'

// The pool as draws see it, computed from the cards alone: a normal card's `holder` is the source of truth for
// whether it is in the pool. The library's Durum (`hands/cardStatus.ts`) also names holders, so it reads the
// holdings instead.

/** The rarities a draw can be narrowed to. `blessed` means the Blessed kind, which has no rarity of its own. */
export const DRAW_RARITIES = ['common', 'rare', 'blessed'] as const
export type DrawRarity = (typeof DRAW_RARITIES)[number]

/** The DM's filters for a random draw. `null` leaves that filter out. */
export type DrawFilters = {
  /** The written cost, compared trimmed and ignoring case. */
  cost: string | null
  mechanicPack: string | null
  rarity: DrawRarity | null
  /** Matched as the library search matches. */
  keyword: string | null
}

/** No filter set: the whole pool. */
export const NO_FILTERS: DrawFilters = {
  cost: null,
  mechanicPack: null,
  rarity: null,
  keyword: null,
}

/**
 * True for a card a random draw can give: an active normal card without a holder, or an active Blessed card, never a
 * DM-only one (spec: card-draws, "Equal chance from the pool").
 */
export function isDrawable(card: Card): boolean {
  if (card.status !== 'active' || card.dmOnly) return false
  return card.kind === 'blessed' || (card.kind === 'normal' && card.holder === null)
}

/**
 * The cards a random draw picks from. Held normal cards, Cursed cards, drafts, retired cards and DM-only cards are
 * never in it.
 */
export function drawablePool(cards: readonly Card[]): Card[] {
  return cards.filter(isDrawable)
}

/** The cards a Cursed draw and a pack's Cursed card pick from: the active Cursed cards that are not DM-only. */
export function cursedPool(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'cursed' && card.status === 'active' && !card.dmOnly)
}

/** A card's rarity for the draw filter: its rarity, `blessed` for a Blessed card, and none for a Cursed card. */
export function drawRarity(card: Card): DrawRarity | null {
  return card.kind === 'blessed' ? 'blessed' : card.rarity
}

const costKey = (cost: string | null) => cost?.trim().toLowerCase() || null

/** True when the card passes every filter that is set. */
export function matchesFilters(card: Card, filters: DrawFilters): boolean {
  return (
    (filters.cost === null || costKey(card.cost) === costKey(filters.cost)) &&
    (filters.mechanicPack === null || card.mechanicPack === filters.mechanicPack) &&
    (filters.rarity === null || drawRarity(card) === filters.rarity) &&
    (filters.keyword === null || cardMatchesQuery(cardHaystack(card), filters.keyword))
  )
}

/** The filters to store with a draw: blank values dropped, and `null` when no filter is left. */
export function activeFilters(filters: DrawFilters): DrawFilters | null {
  const text = (value: string | null) => value?.trim() || null
  const active: DrawFilters = {
    cost: text(filters.cost),
    mechanicPack: text(filters.mechanicPack),
    rarity: filters.rarity,
    keyword: text(filters.keyword),
  }
  return Object.values(active).some((value) => value !== null) ? active : null
}

export type DrawFilterOptions = {
  /** The written costs, numbers first in numeric order, then the others ("X", "d6") alphabetically. */
  costs: string[]
  /** In Turkish alphabetical order. */
  mechanicPacks: string[]
  /** Always all three. */
  rarities: readonly DrawRarity[]
}

/** The filter choices, from the drawable cards: only values that some drawable card has. */
export function drawFilterOptions(cards: readonly Card[]): DrawFilterOptions {
  const costs = new Map<string, string>()
  const packs = new Set<string>()
  for (const card of drawablePool(cards)) {
    const key = costKey(card.cost)
    if (key !== null && card.cost !== null && !costs.has(key)) costs.set(key, card.cost.trim())
    if (card.mechanicPack !== null) packs.add(card.mechanicPack)
  }
  return {
    costs: [...costs.values()].sort(compareCosts),
    mechanicPacks: [...packs].sort(compareLabels),
    rarities: DRAW_RARITIES,
  }
}

function compareCosts(a: string, b: string): number {
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
export function poolDistribution(cards: readonly Card[]): PoolDistribution {
  const pool = drawablePool(cards)
  const total = pool.length
  const share = (count: number) => percent.format(count / total)
  const rarityOf = (card: Card) => rarityLabel(card) ?? 'Blessed'
  const setOf = (card: Card) => setLabel(card) ?? 'Blessed'

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

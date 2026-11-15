import type { SetIndex } from '@/features/sets/index'

import { cardHaystack, cardMatchesQuery } from './display'
import {
  compareCosts,
  costKey,
  DRAW_RARITIES,
  type DrawFilters,
  drawRarity,
  type SetLookup,
  setFilterCode,
} from './pool'
import type { Card, Definition } from './schema'
import { setChoices } from './setChoices'
import { compareLabels } from './sort'
import { normalize } from './text'

// The DM's card filters as facets: each facet narrows the cards by one value, and its choices count the cards the
// other facets leave (spec: card-draws, "Filter choices show what remains"). The draw dialog and "+ Kart ver" share
// them (design D1).

/** The facets the dialogs offer. `rarity` is the draw's (Common, Rare, Blessed); `kind` adds Cursed for giving. */
export type FacetKey = 'set' | 'rarity' | 'kind' | 'cost' | 'mechanicPack'

/** One choice of a facet: the value a filter keeps, the label it shows, and the matching cards. */
export type FacetChoice = { value: string; label: string; count: number }

export type Facet = {
  key: FacetKey
  /** The facet's Turkish name on its pill. */
  name: string
  /** The card's value as the facet compares it, or `null` when the card has none (it never matches a value). */
  cardKey: (card: Card) => string | null
  /** A chosen value as the facet compares it. */
  valueKey: (value: string) => string
  /** The values the cards have, each once, in the facet's order, with their labels. */
  choices: (cards: readonly Card[]) => { value: string; label: string }[]
  /** The label of a chosen value that the cards no longer have. */
  labelOf: (value: string) => string
}

/** The chosen value of each facet; a missing key or `null` leaves that facet out. */
export type FacetValues = Partial<Record<FacetKey, string | null>>

/** A test every shown card must pass besides the facets: the keyword, or "Yalnızca havuzdakiler". */
export type CardTest = (card: Card) => boolean

const RARITY_LABELS = { common: 'Common', rare: 'Rare', blessed: 'Blessed', cursed: 'Cursed' }

/** The kinds "+ Kart ver" offers, in order. */
export const GIVE_KINDS = ['common', 'rare', 'blessed', 'cursed'] as const
export type GiveKind = (typeof GIVE_KINDS)[number]

/** The set facet: the sets in the shop order, by their official names, without "Blessed" (design D1). */
export function setFacet(sets: SetLookup & Pick<SetIndex, 'setRank'>): Facet {
  const key = (code: string) => normalize(setFilterCode(code, sets))
  return {
    key: 'set',
    name: 'Set',
    cardKey: (card) => (card.setCode === null ? null : key(card.setCode)),
    valueKey: key,
    choices: (cards) =>
      setChoices(cards, sets, { withBlessed: false }).map(({ code, label }) => ({
        value: code,
        label,
      })),
    labelOf: sets.setName,
  }
}

/**
 * The costs the cards or True Words have, each once as first written and trimmed, numbers first in numeric order, then
 * the others in Turkish alphabetical order. Shared by the dialogs' cost facet and the Kütüphane's Cost filter (design
 * D6 of merge-library-tabs).
 */
export function costChoices(cards: readonly Pick<Definition, 'cost'>[]): string[] {
  const costs = new Map<string, string>()
  for (const card of cards) {
    const key = costKey(card.cost)
    if (key !== null && card.cost !== null && !costs.has(key)) costs.set(key, card.cost.trim())
  }
  return [...costs.values()].sort(compareCosts)
}

/** True when the card's cost is `cost`, compared trimmed and ignoring case. */
export function hasCost(card: Pick<Definition, 'cost'>, cost: string): boolean {
  return costKey(card.cost) === costKey(cost)
}

/** The cost facet: the written costs, numbers first in numeric order, compared trimmed and ignoring case. */
export const costFacet: Facet = {
  key: 'cost',
  name: 'Cost',
  cardKey: (card) => costKey(card.cost),
  valueKey: (value) => costKey(value) ?? '',
  choices: (cards) => costChoices(cards).map((cost) => ({ value: cost, label: cost })),
  labelOf: (value) => value,
}

/** The mechanic pack facet, in Turkish alphabetical order. */
export const mechanicPackFacet: Facet = {
  key: 'mechanicPack',
  name: 'Mechanic Pack',
  cardKey: (card) => card.mechanicPack,
  valueKey: (value) => value,
  choices: (cards) =>
    [...new Set(cards.flatMap((card) => (card.mechanicPack === null ? [] : [card.mechanicPack])))]
      .sort(compareLabels)
      .map((pack) => ({ value: pack, label: pack })),
  labelOf: (value) => value,
}

/** The draw's rarity facet: always Common, Rare and Blessed. */
export const rarityFacet: Facet = {
  key: 'rarity',
  name: 'Rarity',
  cardKey: drawRarity,
  valueKey: (value) => value,
  choices: () => DRAW_RARITIES.map((rarity) => ({ value: rarity, label: RARITY_LABELS[rarity] })),
  labelOf: (value) => RARITY_LABELS[value as GiveKind] ?? value,
}

/** The kind of a card as "+ Kart ver" filters it: its rarity, Blessed, or Cursed. */
export function giveKind(card: Card): GiveKind | null {
  return card.kind === 'cursed' ? 'cursed' : drawRarity(card)
}

/** The give dialog's kind facet: always Common, Rare, Blessed and Cursed. */
export const kindFacet: Facet = {
  key: 'kind',
  name: 'Tür',
  cardKey: giveKind,
  valueKey: (value) => value,
  choices: () => GIVE_KINDS.map((kind) => ({ value: kind, label: RARITY_LABELS[kind] })),
  labelOf: rarityFacet.labelOf,
}

/** The draw dialog's facets, in the order of its pills. */
export function drawFacets(sets: SetLookup & Pick<SetIndex, 'setRank'>): Facet[] {
  return [setFacet(sets), rarityFacet, costFacet, mechanicPackFacet]
}

/** The give dialog's facets, in the order of its pills. */
export function giveFacets(sets: SetLookup & Pick<SetIndex, 'setRank'>): Facet[] {
  return [setFacet(sets), kindFacet, costFacet, mechanicPackFacet]
}

const chosen = (values: FacetValues, key: FacetKey) => values[key]?.trim() || null

function passes(card: Card, facet: Facet, value: string | null): boolean {
  return value === null || facet.cardKey(card) === facet.valueKey(value)
}

/** The cards that pass every chosen facet and the test. */
export function applyFacets(
  cards: readonly Card[],
  facets: readonly Facet[],
  values: FacetValues,
  test: CardTest = () => true,
): Card[] {
  return cards.filter(
    (card) => facets.every((facet) => passes(card, facet, chosen(values, facet.key))) && test(card),
  )
}

/**
 * One facet's choices: each value the cards have, in the facet's order, with how many cards match it together with
 * the other chosen facets and the test. A chosen value stays listed with 0 when the cards no longer have it.
 */
export function facetChoices(
  cards: readonly Card[],
  facets: readonly Facet[],
  values: FacetValues,
  key: FacetKey,
  test: CardTest = () => true,
): FacetChoice[] {
  const facet = facets.find((candidate) => candidate.key === key)
  if (!facet) return []
  const others = facets.filter((candidate) => candidate.key !== key)
  const counts = new Map<string, number>()
  for (const card of cards) {
    if (!test(card) || !others.every((other) => passes(card, other, chosen(values, other.key))))
      continue
    const cardKey = facet.cardKey(card)
    if (cardKey !== null) counts.set(cardKey, (counts.get(cardKey) ?? 0) + 1)
  }
  const choices = facet.choices(cards).map(({ value, label }) => ({
    value,
    label,
    count: counts.get(facet.valueKey(value)) ?? 0,
  }))
  const value = chosen(values, key)
  if (
    value !== null &&
    !choices.some((choice) => facet.valueKey(choice.value) === facet.valueKey(value))
  )
    choices.push({ value, label: facet.labelOf(value), count: 0 })
  return choices
}

/** A keyword test that matches as the library search does; every card passes an empty keyword. */
export function keywordTest(keyword: string | null, setName: SetLookup['setName']): CardTest {
  const query = keyword?.trim() ?? ''
  return query === '' ? () => true : (card) => cardMatchesQuery(cardHaystack(card, setName), query)
}

/** The draw filters as facet values. */
export function drawFacetValues(filters: DrawFilters): FacetValues {
  return {
    set: filters.setCode,
    rarity: filters.rarity,
    cost: filters.cost,
    mechanicPack: filters.mechanicPack,
  }
}

/** The draw filter field each of the draw's facets sets. */
export const DRAW_FILTER_FIELDS = {
  set: 'setCode',
  rarity: 'rarity',
  cost: 'cost',
  mechanicPack: 'mechanicPack',
} as const satisfies Partial<Record<FacetKey, keyof DrawFilters>>

/** True when the card passes every filter that is set. The keyword also finds a set's official name. */
export function matchesFilters(
  card: Card,
  filters: DrawFilters,
  sets: SetLookup & Pick<SetIndex, 'setRank'>,
): boolean {
  return (
    applyFacets(
      [card],
      drawFacets(sets),
      drawFacetValues(filters),
      keywordTest(filters.keyword, sets.setName),
    ).length === 1
  )
}

import { formatAmount } from '@/features/balances/format'
import { cursedPool, isDrawable } from '@/features/cards/pool'
import type { Card } from '@/features/cards/schema'
import { officialSet, setDisplayName, setOrder } from '@/features/cards/sets'
import { compareLabels } from '@/features/cards/sort'
import { type PackType, SET_PACK_TYPES } from '@/features/draws/schema'

// The Pack Shop's packs, their prices, and when each can be opened (docs/domain.md, Packs). Pure helpers on the
// cards: the pool is the cards' `holder`, as in `cards/pool.ts`.

/** One pack the shop offers. */
export type PackDef = {
  /** Unique in the shop: the type with its set or mechanic pack. */
  key: string
  type: PackType
  /** The set, for the pack types of one set. */
  setCode: string | null
  /** The mechanic pack, for a Mechanic Pack. */
  mechanicPack: string | null
}

/**
 * The price of each pack type, in LP and in GP. The LP price is what a player pays: keep it in step with
 * `packPrice()` in `firestore.rules`. The DM's payment starts at either price.
 */
export const PACK_PRICES: Record<PackType, { lp: number; gp: number }> = {
  standard: { lp: 2, gp: 5000 },
  premium: { lp: 3, gp: 7500 },
  cursed: { lp: 1, gp: 2500 },
  pandemonium: { lp: 3, gp: 7500 },
  pandemoniumCursed: { lp: 3, gp: 7500 },
  mechanic: { lp: 4, gp: 10000 },
  golden: { lp: 4, gp: 10000 },
  cursedGolden: { lp: 3, gp: 7500 },
}

/** A price as the shop shows it: "2 LP / 5.000 GP". */
export function priceLabel(type: PackType): string {
  const { lp, gp } = PACK_PRICES[type]
  return `${lp} LP / ${formatAmount(gp)} GP`
}

/** True for the Pandemonium set, which has its own two packs instead of Standard, Premium and Cursed. */
export function isPandemoniumSet(setCode: string): boolean {
  return officialSet(setCode)?.code === 'Pandemonium'
}

const SET_TYPE_SUFFIX: Partial<Record<PackType, string>> = {
  standard: 'Standard Pack',
  premium: 'Premium Pack',
  cursed: 'Cursed Pack',
  pandemonium: 'Pack',
  pandemoniumCursed: 'Cursed Pack',
}

/** The pack's name, with the official set name: "Kesqerian Nights Standard Pack", "Golden Pack". */
export function packTitle(def: Pick<PackDef, 'type' | 'setCode' | 'mechanicPack'>): string {
  if (def.type === 'golden') return 'Golden Pack'
  if (def.type === 'cursedGolden') return 'Cursed Golden Pack'
  if (def.type === 'mechanic') return `${def.mechanicPack ?? ''} Mechanic Pack`
  return `${setDisplayName(def.setCode ?? '')} ${SET_TYPE_SUFFIX[def.type] ?? 'Pack'}`
}

/** The name of the pack a record opened, from its type and its set or mechanic pack. */
export function packOpeningTitle(pack: {
  packType: PackType
  setCode: string | null
  mechanicPack: string | null
}): string {
  return packTitle({ type: pack.packType, setCode: pack.setCode, mechanicPack: pack.mechanicPack })
}

function setPack(type: PackType, setCode: string): PackDef {
  return { key: `${type}:${setCode}`, type, setCode, mechanicPack: null }
}

export const GOLDEN_PACKS: readonly PackDef[] = [
  { key: 'golden', type: 'golden', setCode: null, mechanicPack: null },
  { key: 'cursedGolden', type: 'cursedGolden', setCode: null, mechanicPack: null },
]

/** One set's packs, shown as a group under Set Packs. */
export type SetGroup = { setCode: string; title: string; packs: PackDef[] }

export type PackCatalog = {
  /** One group per set, in the official order, with Pandemonium last. */
  setGroups: SetGroup[]
  /** One Mechanic Pack per mechanic pack, in Turkish alphabetical order. */
  mechanicPacks: PackDef[]
  /** The Golden and the Cursed Golden Pack: the last tile of Mechanic Packs. */
  goldenPacks: readonly PackDef[]
}

/** The packs of one set: Pandemonium has its own two, every other set Standard, Premium and Cursed. */
export function setPacks(setCode: string): PackDef[] {
  const types: PackType[] = isPandemoniumSet(setCode)
    ? ['pandemonium', 'pandemoniumCursed']
    : ['standard', 'premium', 'cursed']
  return types.map((type) => setPack(type, setCode))
}

/**
 * The shop's packs, from the active cards: a group for every set that has a normal card, and a Mechanic Pack for
 * every mechanic pack of a normal or Blessed card. Whether each can be opened is `packStatus`.
 */
export function packCatalog(cards: readonly Card[]): PackCatalog {
  const sets = new Set<string>()
  const mechanics = new Set<string>()
  for (const card of cards) {
    if (card.retired || card.kind === 'cursed') continue
    if (card.kind === 'normal') sets.add(card.setCode)
    if (card.mechanicPack !== null) mechanics.add(card.mechanicPack)
  }
  const setGroups = [...sets]
    .sort(
      (a, b) =>
        Number(isPandemoniumSet(a)) - Number(isPandemoniumSet(b)) ||
        setOrder(a) - setOrder(b) ||
        compareLabels(a, b),
    )
    .map((setCode) => ({
      setCode,
      title: `${setDisplayName(setCode)} Packs`,
      packs: setPacks(setCode),
    }))
  const mechanicPacks = [...mechanics].sort(compareLabels).map((mechanicPack) => ({
    key: `mechanic:${mechanicPack}`,
    type: 'mechanic' as const,
    setCode: null,
    mechanicPack,
  }))
  return { setGroups, mechanicPacks, goldenPacks: GOLDEN_PACKS }
}

/** The pack a record or a link names, rebuilt from its type and scope. */
export function packDefOf(def: Pick<PackDef, 'type' | 'setCode' | 'mechanicPack'>): PackDef {
  if (def.type === 'mechanic') return { key: `mechanic:${def.mechanicPack ?? ''}`, ...def }
  if (SET_PACK_TYPES.includes(def.type)) return setPack(def.type, def.setCode ?? '')
  return { key: def.type, type: def.type, setCode: null, mechanicPack: null }
}

/**
 * The cards a pack can show, from the pool. `slot` is the Premium Pack's guaranteed Rare. Blessed cards have no set
 * and no rarity: they are among a Mechanic Pack's cards, and the rare packs add every one of them (docs/domain.md).
 */
export type PackPools = {
  /** The cards its 5 (or, for Premium, 4) cards come from. */
  cards: Card[]
  /** Premium only: the Rares its first card comes from. */
  slot: Card[] | null
  /** Cursed types only: the Cursed Deck its sixth card comes from. */
  cursed: Card[] | null
}

/** The cards in the pool, without Blessed cards: the normal cards no one holds. */
function poolNormals(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'normal' && isDrawable(card))
}

const isRare = (card: Card) => card.rarity === 'rare'
const isCommon = (card: Card) => card.rarity === 'common'

function poolBlessed(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'blessed' && isDrawable(card))
}

function inSet(cards: readonly Card[], setCode: string | null): Card[] {
  return poolNormals(cards).filter((card) => card.setCode === setCode)
}

/** The candidate cards of a pack, by its type (docs/domain.md, Packs). */
export function packPools(def: PackDef, cards: readonly Card[]): PackPools {
  const cursedDeck = cursedPool(cards)
  switch (def.type) {
    case 'standard':
      return { cards: inSet(cards, def.setCode), slot: null, cursed: null }
    case 'premium': {
      const set = inSet(cards, def.setCode)
      return { cards: set, slot: set.filter(isRare), cursed: null }
    }
    case 'cursed':
      return { cards: inSet(cards, def.setCode).filter(isCommon), slot: null, cursed: cursedDeck }
    case 'pandemonium':
    case 'pandemoniumCursed': {
      const rares = inSet(cards, def.setCode).filter(isRare)
      const cursed = def.type === 'pandemoniumCursed' ? cursedDeck : null
      return { cards: [...rares, ...poolBlessed(cards)], slot: null, cursed }
    }
    case 'mechanic':
      return {
        cards: cards.filter((card) => card.mechanicPack === def.mechanicPack && isDrawable(card)),
        slot: null,
        cursed: null,
      }
    case 'golden':
    case 'cursedGolden': {
      const rares = poolNormals(cards).filter(isRare)
      const cursed = def.type === 'cursedGolden' ? cursedDeck : null
      return { cards: [...rares, ...poolBlessed(cards)], slot: null, cursed }
    }
  }
}

/** Whether a pack can be opened now, and in Turkish why not. */
export type PackStatus = { canOpen: true } | { canOpen: false; reason: string }

/** The least each pack type needs in the pool, as counted by `countFor` (docs/domain.md, Packs). */
const THRESHOLDS: Record<PackType, number> = {
  standard: 9,
  premium: 9,
  cursed: 5,
  pandemonium: 9,
  pandemoniumCursed: 5,
  mechanic: 29,
  golden: 49,
  cursedGolden: 5,
}

/** Premium also needs this many Rares in its set. */
const PREMIUM_RARES = 3

/**
 * What a pack's threshold counts, and its name in a reason. Blessed cards count only for a Mechanic Pack, as in the
 * legacy app; the rare packs count their Rares without the Blessed cards they add.
 */
function countFor(def: PackDef, cards: readonly Card[]): { count: number; what: string } {
  const set = setDisplayName(def.setCode ?? '')
  switch (def.type) {
    case 'standard':
    case 'premium':
      return { count: inSet(cards, def.setCode).length, what: `${set} kartı` }
    case 'cursed':
      return {
        count: inSet(cards, def.setCode).filter(isCommon).length,
        what: `${set} Common kartı`,
      }
    case 'pandemonium':
    case 'pandemoniumCursed':
      return { count: inSet(cards, def.setCode).filter(isRare).length, what: `${set} Rare kartı` }
    case 'mechanic':
      return { count: packPools(def, cards).cards.length, what: `${def.mechanicPack ?? ''} kartı` }
    case 'golden':
    case 'cursedGolden':
      return { count: poolNormals(cards).filter(isRare).length, what: 'Rare kart' }
  }
}

function tooFew(needed: number, count: number, what: string): PackStatus {
  return {
    canOpen: false,
    reason: `Havuzda yeterli kart yok: en az ${needed} ${what} gerekli, ${count} var.`,
  }
}

/** Whether the pool has enough cards for the pack, and the Cursed Deck a card for a Cursed type. */
export function packStatus(def: PackDef, cards: readonly Card[]): PackStatus {
  const needed = THRESHOLDS[def.type]
  const { count, what } = countFor(def, cards)
  if (count < needed) return tooFew(needed, count, what)
  if (def.type === 'premium') {
    const rares = inSet(cards, def.setCode).filter(isRare).length
    if (rares < PREMIUM_RARES) {
      return tooFew(PREMIUM_RARES, rares, `${setDisplayName(def.setCode ?? '')} Rare kartı`)
    }
  }
  if (packPools(def, cards).cursed?.length === 0) {
    return { canOpen: false, reason: "Cursed Deck'te kart yok." }
  }
  return { canOpen: true }
}

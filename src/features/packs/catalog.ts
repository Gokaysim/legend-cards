import type { ArtLookup } from '@/features/art/artContext'
import { CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
import { formatAmount } from '@/features/balances/format'
import { AS_WRITTEN, type SetName } from '@/features/cards/display'
import { cursedPool, inMechanicPacks, inSetPacks } from '@/features/cards/pool'
import type { Card } from '@/features/cards/schema'
import { compareLabels } from '@/features/cards/sort'
import { type PackType, SET_PACK_TYPES } from '@/features/draws/schema'
import type { SetIndex } from '@/features/sets/index'

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

/**
 * The short names of the packs inside a group, under each tile's picture (spec: card-images, "Short pack names in a
 * group"; design D4 of `polish-cards-packs-and-mascots`). "Standart" is the owner's Turkish spelling, on the tile
 * alone: everywhere else a pack keeps its full `packTitle`.
 */
const SHORT_NAMES: Record<Exclude<PackType, 'pandemonium'>, string> = {
  standard: 'Standart',
  premium: 'Premium',
  cursed: 'Cursed',
  pandemoniumCursed: 'Cursed',
  golden: 'Golden',
  cursedGolden: 'Cursed Golden',
  mechanic: 'Mechanic',
}

/**
 * A pack's short name on its tile inside a group: "Standart", "Premium", "Cursed", "Golden"…, and a one-pack set's Pack
 * by its set's name, as "Pandemonium".
 */
export function packShortName(def: Pick<PackDef, 'type' | 'setCode'>, setName: SetName): string {
  return def.type === 'pandemonium' ? setName(def.setCode ?? '') : SHORT_NAMES[def.type]
}

const SET_TYPE_SUFFIX: Partial<Record<PackType, string>> = {
  standard: 'Standard Pack',
  premium: 'Premium Pack',
  cursed: 'Cursed Pack',
  pandemonium: 'Pack',
  pandemoniumCursed: 'Cursed Pack',
}

/** The pack's name, with the official set name: "Kesqerian Nights Standard Pack", "Golden Pack". */
export function packTitle(
  def: Pick<PackDef, 'type' | 'setCode' | 'mechanicPack'>,
  setName: SetName,
): string {
  if (def.type === 'golden') return 'Golden Pack'
  if (def.type === 'cursedGolden') return 'Cursed Golden Pack'
  if (def.type === 'mechanic') return `${def.mechanicPack ?? ''} Mechanic Pack`
  return `${setName(def.setCode ?? '')} ${SET_TYPE_SUFFIX[def.type] ?? 'Pack'}`
}

/** The name of the pack a record opened, from its type and its set or mechanic pack. */
export function packOpeningTitle(
  pack: {
    packType: PackType
    setCode: string | null
    mechanicPack: string | null
  },
  setName: SetName,
): string {
  return packTitle(
    { type: pack.packType, setCode: pack.setCode, mechanicPack: pack.mechanicPack },
    setName,
  )
}

function setPack(type: PackType, setCode: string): PackDef {
  return { key: `${type}:${setCode}`, type, setCode, mechanicPack: null }
}

export const GOLDEN_PACKS: readonly PackDef[] = [
  { key: 'golden', type: 'golden', setCode: null, mechanicPack: null },
  { key: 'cursedGolden', type: 'cursedGolden', setCode: null, mechanicPack: null },
]

/** The Golden Packs group's Cardmaker, shown larger. */
export const GOLDEN_GROUP_MASCOT = 'cardmaker_gold'

/** One set's packs, shown as a group under Set Packs. */
export type SetGroup = { setCode: string; title: string; packs: PackDef[] }

export type PackCatalog = {
  /** One group per set, in the stored order, then set codes that no stored set has, alphabetically. */
  setGroups: SetGroup[]
  /** One Mechanic Pack per mechanic pack, in Turkish alphabetical order. */
  mechanicPacks: PackDef[]
  /** The Golden and the Cursed Golden Pack: the last tile of Mechanic Packs. */
  goldenPacks: readonly PackDef[]
}

/**
 * The packs of one set, by its pack layout (spec: pack-shop, "Pack types"): a Pack and a Cursed Pack for the
 * `pandemonium` layout, else a Standard, a Premium and a Cursed Pack, also for a code no stored set has.
 */
export function setPacks(setCode: string, sets: SetIndex): PackDef[] {
  const types: PackType[] =
    sets.setOf(setCode)?.packLayout === 'pandemonium'
      ? ['pandemonium', 'pandemoniumCursed']
      : ['standard', 'premium', 'cursed']
  return types.map((type) => setPack(type, setCode))
}

/**
 * The shop's packs, from the active cards: a group for every set that has a normal card, and a Mechanic Pack for
 * every mechanic pack of a normal or Blessed card. Whether each can be opened is `packStatus`.
 */
export function packCatalog(cards: readonly Card[], sets: SetIndex): PackCatalog {
  const codes = new Set<string>()
  const mechanics = new Set<string>()
  for (const card of cards) {
    if (card.status !== 'active' || card.kind === 'cursed') continue
    if (card.kind === 'normal' && card.setCode !== null) codes.add(card.setCode)
    if (card.mechanicPack !== null) mechanics.add(card.mechanicPack)
  }
  const setGroups = [...codes]
    .sort((a, b) => sets.setRank(a) - sets.setRank(b) || compareLabels(a, b))
    .map((setCode) => ({
      setCode,
      title: `${sets.setName(setCode)} Packs`,
      packs: setPacks(setCode, sets),
    }))
  const mechanicPacks = [...mechanics].sort(compareLabels).map((mechanicPack) => ({
    key: `mechanic:${mechanicPack}`,
    type: 'mechanic' as const,
    setCode: null,
    mechanicPack,
  }))
  return { setGroups, mechanicPacks, goldenPacks: GOLDEN_PACKS }
}

/**
 * The back every face-down card of a pack shows (design D7; design D1 of `polish-cards-packs-and-mascots`): the set's
 * cardback for a set's Standard, Premium or Pandemonium Pack, the Cursed cardback for every Cursed type, the Mechanic
 * Pack's own picture for a Mechanic Pack, and the neutral back for a Golden Pack, whose cards can be of any set. Never
 * the card's own: the same back for every card of the pack, so a back gives nothing away.
 */
export function spreadBackOf(pack: {
  packType: PackType
  setCode: string | null
  mechanicPack: string | null
}): SpreadBack {
  switch (pack.packType) {
    case 'standard':
    case 'premium':
    case 'pandemonium':
      return pack.setCode === null ? NEUTRAL_BACK : { kind: 'set', setCode: pack.setCode }
    case 'cursed':
    case 'pandemoniumCursed':
    case 'cursedGolden':
      return CURSED_BACK
    case 'mechanic':
      return {
        kind: 'pack',
        packKey: packDefOf({ type: 'mechanic', setCode: null, mechanicPack: pack.mechanicPack })
          .key,
      }
    case 'golden':
      return NEUTRAL_BACK
  }
}

/**
 * The picture that swells and bursts when a pack opens (spec: pack-shop, design D8): a set's cardback for the packs of
 * one set, Cursed and Pandemonium ones included, or else the pack's own picture, as in v2.2.8. `null` draws the pack
 * without a picture.
 */
export function burstArtUrl(
  art: ArtLookup,
  pack: { packType: PackType; setCode: string | null; mechanicPack: string | null },
): string | null {
  const packUrl = art.packUrl(
    packDefOf({ type: pack.packType, setCode: pack.setCode, mechanicPack: pack.mechanicPack }).key,
  )
  return pack.setCode === null ? packUrl : (art.backUrl(pack.setCode) ?? packUrl)
}

/**
 * The picture of a group's tile in the shop's main view (spec: card-images, "Pictures of the pack groups"): a set's
 * cardback, or for the Golden Packs the Golden Pack's picture. `null` keeps the group's glyph.
 */
export function groupArtUrl(art: ArtLookup, group: { packs: readonly PackDef[] }): string | null {
  const first = group.packs[0]
  if (first === undefined) return null
  return first.setCode === null ? art.packUrl(first.key) : art.backUrl(first.setCode)
}

/** The pack a record or a link names, rebuilt from its type and scope. */
export function packDefOf(def: Pick<PackDef, 'type' | 'setCode' | 'mechanicPack'>): PackDef {
  if (def.type === 'mechanic') return { key: `mechanic:${def.mechanicPack ?? ''}`, ...def }
  if (SET_PACK_TYPES.includes(def.type)) return setPack(def.type, def.setCode ?? '')
  return { key: def.type, type: def.type, setCode: null, mechanicPack: null }
}

/**
 * The cards a pack can show, from the pool and by the pack flags (spec: pack-shop, "Packs follow the pack flags"):
 * a set's packs take the cards with "Set paketlerinde çıkar" on, and the Mechanic and Golden Packs those with
 * "Mechanic paketlerinde çıkar" on. `slot` is the Premium Pack's guaranteed Rare. Blessed cards have no set and no
 * rarity: they are among a Mechanic Pack's cards, and the rare packs add those with the pack's flag on.
 */
export type PackPools = {
  /** The cards its 5 (or, for Premium, 4) cards come from. */
  cards: Card[]
  /** Premium only: the Rares its first card comes from. */
  slot: Card[] | null
  /** Cursed types only: the Cursed Deck its sixth card comes from. */
  cursed: Card[] | null
}

const isRare = (card: Card) => card.rarity === 'rare'
const isCommon = (card: Card) => card.rarity === 'common'

/** The normal cards of a set that its packs can show: in the pool, with "Set paketlerinde çıkar" on. */
function inSet(cards: readonly Card[], setCode: string | null): Card[] {
  return cards.filter(
    (card) => card.kind === 'normal' && card.setCode === setCode && inSetPacks(card),
  )
}

/** The Blessed cards a one-pack set's packs add to its Rares: those with "Set paketlerinde çıkar" on. */
function setPackBlessed(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'blessed' && inSetPacks(card))
}

/** The normal Rares across all sets the Golden Packs can show: those with "Mechanic paketlerinde çıkar" on. */
function goldenRares(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'normal' && isRare(card) && inMechanicPacks(card))
}

/** The Blessed cards the Golden Packs add to their Rares: those with "Mechanic paketlerinde çıkar" on. */
function goldenBlessed(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind === 'blessed' && inMechanicPacks(card))
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
      return { cards: [...rares, ...setPackBlessed(cards)], slot: null, cursed }
    }
    case 'mechanic':
      return {
        cards: cards.filter(
          (card) => card.mechanicPack === def.mechanicPack && inMechanicPacks(card),
        ),
        slot: null,
        cursed: null,
      }
    case 'golden':
    case 'cursedGolden': {
      const cursed = def.type === 'cursedGolden' ? cursedDeck : null
      return { cards: [...goldenRares(cards), ...goldenBlessed(cards)], slot: null, cursed }
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
function countFor(
  def: PackDef,
  cards: readonly Card[],
  setName: SetName,
): { count: number; what: string } {
  const set = setName(def.setCode ?? '')
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
      return { count: goldenRares(cards).length, what: 'Rare kart' }
  }
}

function tooFew(needed: number, count: number, what: string): PackStatus {
  return {
    canOpen: false,
    reason: `Havuzda yeterli kart yok: en az ${needed} ${what} gerekli, ${count} var.`,
  }
}

/**
 * Whether the pool has enough cards for the pack, and the Cursed Deck a card for a Cursed type. `setName` names the set
 * in the reason.
 */
export function packStatus(
  def: PackDef,
  cards: readonly Card[],
  setName: SetName = AS_WRITTEN,
): PackStatus {
  const needed = THRESHOLDS[def.type]
  const { count, what } = countFor(def, cards, setName)
  if (count < needed) return tooFew(needed, count, what)
  if (def.type === 'premium') {
    const rares = inSet(cards, def.setCode).filter(isRare).length
    if (rares < PREMIUM_RARES) {
      return tooFew(PREMIUM_RARES, rares, `${setName(def.setCode ?? '')} Rare kartı`)
    }
  }
  if (packPools(def, cards).cursed?.length === 0) {
    return { canOpen: false, reason: "Cursed Deck'te kart yok." }
  }
  return { canOpen: true }
}

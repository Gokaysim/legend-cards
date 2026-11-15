import type { Card } from '@/features/cards/schema'
import { type CardStatus, DM_ONLY_MARK, statusLabel } from '@/features/cards/status'
import { STATUS_LABELS } from '@/features/definitions/status'
import { type PackOpening, PACK_TYPES, type PackType } from '@/features/draws/schema'
import type { Holding, KeptUse } from '@/features/hands/schema'
import type { SetIndex } from '@/features/sets/index'
import type { CardSet, PackLayout } from '@/features/sets/schema'

import { cardStats, type CardStats } from './cardHistory'

// A set's statistics (spec: card-stats, "The Set istatistikleri page"; design D5 of add-card-and-set-stats). Pure:
// the set's counted cards and every holding and pack opening in, one row per card and the tiles out.

/**
 * The cards of `set` a page counts, of the cards the viewer lists: the normal cards whose set code finds the set. Pass
 * the DM every card of the deck, whatever its status, and a player the active cards that are not DM-only, as the
 * Setler screen counts them.
 */
export function setCards(
  cards: readonly Card[],
  set: Pick<CardSet, 'id'>,
  index: Pick<SetIndex, 'setOf'>,
): Card[] {
  return cards.filter(
    (card) =>
      card.kind === 'normal' && card.setCode !== null && index.setOf(card.setCode)?.id === set.id,
  )
}

/** One card's row in the set's table. */
export type SetCardRow = {
  card: Card
  stats: CardStats
  /** On the DM's page: "Taslak", "🔒 DM" and "Kaldırıldı", for a draft, a hidden and a retired card. */
  marks: string[]
  /** The Durum text: where the card is now. */
  status: string
  inPool: boolean
  /** At least one hand holds it now. */
  isHeld: boolean
}

function marksOf(card: Card): string[] {
  const marks: string[] = []
  if (card.status !== 'active') marks.push(STATUS_LABELS[card.status])
  if (!card.isInLibrary) marks.push(DM_ONLY_MARK)
  return marks
}

/** The Durum text of a row: the library's, except that a draft reads "Taslak". */
function statusText(card: Card, status: CardStatus): string {
  if (card.status === 'draft') return STATUS_LABELS.draft
  return statusLabel(card, status)
}

const NO_STATUS: CardStatus = { inPool: false, holderNames: [] }

/**
 * One row per counted card, from every holding, kept use and pack opening, in one pass over each: the records of other
 * cards are skipped. `statuses` gives where each card is now (`useCardStatuses`).
 */
export function setCardRows(
  cards: readonly Card[],
  records: {
    holdings: readonly Holding[]
    uses: readonly KeptUse[]
    packs: readonly PackOpening[]
  },
  statuses: ReadonlyMap<string, CardStatus>,
  now: number,
): SetCardRow[] {
  const holdingsByCard = new Map<string, Holding[]>(cards.map((card) => [card.id, []]))
  for (const holding of records.holdings) holdingsByCard.get(holding.cardId)?.push(holding)
  const usesByCard = new Map<string, KeptUse[]>(cards.map((card) => [card.id, []]))
  for (const use of records.uses) usesByCard.get(use.cardId)?.push(use)
  const packsByCard = new Map<string, PackOpening[]>(cards.map((card) => [card.id, []]))
  for (const pack of records.packs) {
    for (const cardId of pack.offered) packsByCard.get(cardId)?.push(pack)
  }
  return cards.map((card) => {
    const status = statuses.get(card.id) ?? NO_STATUS
    return {
      card,
      stats: cardStats(
        card.id,
        {
          holdings: holdingsByCard.get(card.id) ?? [],
          uses: usesByCard.get(card.id) ?? [],
          packs: packsByCard.get(card.id) ?? [],
        },
        now,
      ),
      marks: marksOf(card),
      status: statusText(card, status),
      inPool: status.inPool,
      isHeld: status.holderNames.length > 0,
    }
  })
}

/** The pack types of each layout, in the shop's order. */
const LAYOUT_PACK_TYPES: Readonly<Record<PackLayout, readonly PackType[]>> = {
  standard: ['standard', 'premium', 'cursed'],
  pandemonium: ['pandemonium', 'pandemoniumCursed'],
}

/** The names of a set's pack types on the "Açılan pack" tile. */
const PACK_PART_NAMES: Partial<Record<PackType, string>> = {
  standard: 'Standard',
  premium: 'Premium',
  cursed: 'Cursed',
  pandemonium: 'Pack',
  pandemoniumCursed: 'Cursed Pack',
}

/** The values of a set's eight tiles. */
export type SetTiles = {
  cards: number
  /** How many of the counted cards are drafts, DM-only and retired: only the DM's page counts any. */
  marked: { draft: number; hidden: number; retired: number }
  inPool: number
  held: number
  reached: CardStats['reached']
  used: number
  lpPaid: number
  discarded: number
  transferred: number
  /** The set's pack openings that were not cancelled, and their number by pack type. */
  packs: { total: number; parts: { name: string; count: number }[] }
  neverHeld: number
}

/**
 * The tiles of a set's page: the sums of its rows, and its pack openings that were not cancelled, by type. The types
 * of the set's layout are always named, and another type only when the set has openings of it.
 */
export function setTiles(
  rows: readonly SetCardRow[],
  set: Pick<CardSet, 'id' | 'packLayout'>,
  packs: readonly PackOpening[],
  index: Pick<SetIndex, 'setOf'>,
): SetTiles {
  const tiles: SetTiles = {
    cards: rows.length,
    marked: { draft: 0, hidden: 0, retired: 0 },
    inPool: 0,
    held: 0,
    reached: { dm: 0, draw: 0, pack: 0, total: 0 },
    used: 0,
    lpPaid: 0,
    discarded: 0,
    transferred: 0,
    packs: { total: 0, parts: [] },
    neverHeld: 0,
  }
  for (const { card, stats, inPool, isHeld } of rows) {
    if (card.status === 'draft') tiles.marked.draft += 1
    if (card.status === 'retired') tiles.marked.retired += 1
    if (!card.isInLibrary) tiles.marked.hidden += 1
    if (inPool) tiles.inPool += 1
    if (isHeld) tiles.held += 1
    tiles.reached.dm += stats.reached.dm
    tiles.reached.draw += stats.reached.draw
    tiles.reached.pack += stats.reached.pack
    tiles.reached.total += stats.reached.total
    tiles.used += stats.used
    tiles.lpPaid += stats.lpPaid
    tiles.discarded += stats.discarded
    tiles.transferred += stats.transferred
    if (stats.holdings === 0) tiles.neverHeld += 1
  }

  const byType = new Map<PackType, number>()
  for (const pack of packs) {
    if (pack.status === 'cancelled' || pack.setCode === null) continue
    if (index.setOf(pack.setCode)?.id !== set.id) continue
    byType.set(pack.packType, (byType.get(pack.packType) ?? 0) + 1)
    tiles.packs.total += 1
  }
  const named = LAYOUT_PACK_TYPES[set.packLayout]
  tiles.packs.parts = PACK_TYPES.filter((type) => named.includes(type) || byType.has(type)).map(
    (type) => ({ name: PACK_PART_NAMES[type] ?? type, count: byType.get(type) ?? 0 }),
  )
  return tiles
}

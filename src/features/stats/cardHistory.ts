import type { Timestamp } from 'firebase/firestore'

import type { CardDraw, PackOpening } from '@/features/draws/schema'
import type { Holding, KeptUse } from '@/features/hands/schema'

// What happened to one card, counted from the permanent records (spec: card-stats; design D5 of
// add-card-and-set-stats). Pure: the records and the current time in, the tile values and the history rows out.

export const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A card's records: every holding of it, open and closed, every use of it while kept on use, and the packs that showed
 * it.
 */
export type CardCountRecords = {
  holdings: readonly Holding[]
  uses: readonly KeptUse[]
  packs: readonly PackOpening[]
}

/** The records a card's history lists: also its card draws, for how each was drawn and paid for. */
export type CardRecords = CardCountRecords & { draws: readonly CardDraw[] }

/** The values of a card's stat tiles. */
export type CardStats = {
  /** The holdings the DM gave, a draw opened or a pack gave, by way. A transfer is counted apart. */
  reached: { dm: number; draw: number; pack: number; total: number }
  used: number
  /** The LP paid for the uses, a use recorded without a payment counting as 0. */
  lpPaid: number
  discarded: number
  transferred: number
  /** The packs that turned the card face up, whatever became of them. */
  shown: number
  /** The packs whose choice took the card: chosen, or, for a Cursed card, gone to the hand with the choice. */
  taken: number
  /** Everyone who ever held the card, each once, in the order they first got it. */
  holders: string[]
  /** The number of holdings, transfers included. */
  holdings: number
  /** The time of every holding added up: from its give to its close, or to now while it is open. */
  heldMs: number
  /** The newest use, in milliseconds. `null` when never used. */
  lastUsedAt: number | null
  /** The first holding's give, in milliseconds. `null` when never held. */
  firstHeldAt: number | null
}

/** A server time in milliseconds, or `now` while it is pending. */
function millisOr(at: Timestamp | null, now: number): number {
  return at === null ? now : at.toMillis()
}

function isClosed(holding: Holding): boolean {
  return holding.returnReason !== null
}

/** Whether the pack turned the card face up. A face-down position is in `offered` but did not show the card. */
export function packShowed(pack: PackOpening, cardId: string): boolean {
  const position = pack.offered.indexOf(cardId)
  return position !== -1 && pack.revealed.includes(position)
}

/** Whether the pack's choice took the card to the hand: as its chosen card, or as a Cursed type's Cursed card. */
export function packGave(pack: PackOpening, cardId: string): boolean {
  return pack.chosen?.cardId === cardId || pack.cursed?.cardId === cardId
}

/** The tile values of the card `cardId` from its records, with open holdings and pending times counted to `now`. */
export function cardStats(cardId: string, records: CardCountRecords, now: number): CardStats {
  const stats: CardStats = {
    reached: { dm: 0, draw: 0, pack: 0, total: 0 },
    used: 0,
    lpPaid: 0,
    discarded: 0,
    transferred: 0,
    shown: 0,
    taken: 0,
    holders: [],
    holdings: 0,
    heldMs: 0,
    lastUsedAt: null,
    firstHeldAt: null,
  }
  for (const holding of records.holdings) {
    if (holding.cardId !== cardId) continue
    stats.holdings += 1
    // A card never arrives from a True Word draft; only a True Word does, and words have no history page.
    if (holding.givenVia !== 'transfer' && holding.givenVia !== 'draft') {
      stats.reached[holding.givenVia] += 1
      stats.reached.total += 1
    }
    if (!stats.holders.includes(holding.uid)) stats.holders.push(holding.uid)

    const givenAt = millisOr(holding.givenAt, now)
    const endsAt = isClosed(holding) ? millisOr(holding.returnedAt, now) : now
    stats.heldMs += Math.max(0, endsAt - givenAt)
    stats.firstHeldAt = Math.min(stats.firstHeldAt ?? givenAt, givenAt)

    if (holding.returnReason === 'used') {
      stats.used += 1
      stats.lpPaid += holding.useCost ?? 0
      stats.lastUsedAt = Math.max(stats.lastUsedAt ?? endsAt, endsAt)
    } else if (holding.returnReason === 'discarded') {
      stats.discarded += 1
    } else if (holding.returnReason === 'transferred') {
      stats.transferred += 1
    }
  }
  // A card kept on use counts each use from its record: the holding stays open (spec: card-stats, "Counting how a card
  // left a hand").
  for (const use of records.uses) {
    if (use.cardId !== cardId) continue
    const at = millisOr(use.at, now)
    stats.used += 1
    stats.lpPaid += use.cost
    stats.lastUsedAt = Math.max(stats.lastUsedAt ?? at, at)
  }
  for (const pack of records.packs) {
    if (packShowed(pack, cardId)) stats.shown += 1
    if (packGave(pack, cardId)) stats.taken += 1
  }
  return stats
}

/** "Elde kaldı" in whole days, rounded down. `null` when the card was never held. */
export function heldDays(stats: Pick<CardStats, 'heldMs' | 'holdings'>): number | null {
  return stats.holdings === 0 ? null : Math.floor(stats.heldMs / DAY_MS)
}

/** The average stay in days, unrounded. `null` when the card was never held. */
export function averageHeldDays(stats: Pick<CardStats, 'heldMs' | 'holdings'>): number | null {
  return stats.holdings === 0 ? null : stats.heldMs / stats.holdings / DAY_MS
}

/** One line of a card's Geçmiş list. `at` is `null` while its server time is pending. */
export type HistoryRow = { key: string; at: Timestamp | null } & (
  | { kind: 'given'; holding: Holding }
  /** A draw opened the holding. `draw` is missing only when its record was not read. */
  | { kind: 'drawn'; holding: Holding; draw: CardDraw | undefined }
  /** A pack's choice opened the holding: the chosen card, or a Cursed type's Cursed card. */
  | { kind: 'fromPack'; holding: Holding; pack: PackOpening | undefined }
  | { kind: 'used'; holding: Holding }
  /** A use of a card kept on use: its holding stays open. */
  | { kind: 'keptUsed'; use: KeptUse }
  | { kind: 'discarded'; holding: Holding }
  /** One row per transfer: the closed holding, and the receiver's holding when it was read. */
  | { kind: 'transferred'; holding: Holding; receiver: Holding | undefined }
  /** A pack turned the card face up, and its choice did not take it. */
  | { kind: 'seen'; pack: PackOpening }
)

/** At the same time, a holding's close comes above its give, and both above a pack that only showed the card. */
const SAME_TIME_ORDER: Record<HistoryRow['kind'], number> = {
  used: 0,
  keptUsed: 0,
  discarded: 0,
  transferred: 0,
  given: 1,
  drawn: 1,
  fromPack: 1,
  seen: 2,
}

/**
 * The card's Geçmiş list, newest first, with pending times at the top. A holding adds the row of how it reached the
 * hand and, once closed, the row of how it left. A transfer is one row, from the holding it closed: the receiver's
 * holding adds none. A pack adds a row of its own only when it showed the card face up and its choice did not take
 * it; a pack that took it is named by the holding's row.
 */
export function historyRows(cardId: string, records: CardRecords): HistoryRow[] {
  const holdingsById = new Map(records.holdings.map((holding) => [holding.id, holding]))
  const drawsById = new Map(records.draws.map((draw) => [draw.id, draw]))
  const packsById = new Map(records.packs.map((pack) => [pack.id, pack]))
  const rows: HistoryRow[] = []

  for (const holding of records.holdings) {
    if (holding.cardId !== cardId) continue
    const opened = { key: `${holding.id}:given`, at: holding.givenAt }
    if (holding.givenVia === 'dm') rows.push({ ...opened, kind: 'given', holding })
    else if (holding.givenVia === 'draw') {
      const draw = holding.drawId === null ? undefined : drawsById.get(holding.drawId)
      rows.push({ ...opened, kind: 'drawn', holding, draw })
    } else if (holding.givenVia === 'pack') {
      const pack = holding.drawId === null ? undefined : packsById.get(holding.drawId)
      rows.push({ ...opened, kind: 'fromPack', holding, pack })
    }

    const closed = { key: `${holding.id}:closed`, at: holding.returnedAt }
    if (holding.returnReason === 'used') rows.push({ ...closed, kind: 'used', holding })
    else if (holding.returnReason === 'discarded') {
      rows.push({ ...closed, kind: 'discarded', holding })
    } else if (holding.returnReason === 'transferred') {
      const receiver =
        holding.transferredTo === null ? undefined : holdingsById.get(holding.transferredTo)
      rows.push({ ...closed, kind: 'transferred', holding, receiver })
    }
  }

  for (const use of records.uses) {
    if (use.cardId !== cardId) continue
    rows.push({ key: `${use.id}:used`, at: use.at, kind: 'keptUsed', use })
  }

  for (const pack of records.packs) {
    if (packShowed(pack, cardId) && !packGave(pack, cardId)) {
      rows.push({ key: `${pack.id}:seen`, at: pack.at, kind: 'seen', pack })
    }
  }

  // A pending time is the newest of all, even when the page read `now` before it happened.
  const sortTime = (row: HistoryRow) => (row.at === null ? Infinity : row.at.toMillis())
  return rows.sort(
    (a, b) =>
      sortTime(b) - sortTime(a) ||
      SAME_TIME_ORDER[a.kind] - SAME_TIME_ORDER[b.kind] ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  )
}

import type { LedgerEntry } from '@/features/balances/schema'
import type { DefinitionStepRecord, ImportRecord } from '@/features/definitions/schema'
import type { CardDraw, Draw, PackOpening } from '@/features/draws/schema'
import type { Holding, KeptUse } from '@/features/hands/schema'
import type { SetChange } from '@/features/sets/schema'
import type { TableChange } from '@/features/table/schema'
import { type LearnedWord, learnedWordOf, type WordDraft } from '@/features/true-words/schema'

/** A server time, or `null` while it is pending in the local snapshot. */
export type EventTime = Holding['givenAt']

/**
 * The records the log is read from, each source newest first and limited to the same `n` (design D10 of
 * unify-cards-and-true-words): the holdings the DM gave or transferred, the words the DM taught among them, by the time
 * they were given; closed holdings, the words the DM took back among them, by the time they were closed; draws, pack
 * openings and True Word drafts; the ledger's changes by hand; the uses of cards and words kept on use; the definition
 * changes this device may read; the set changes; and the table setting changes. The holdings and entries of draws, packs and drafts, the entries of
 * uses, and the words learned from drafts, are not among them.
 */
export type LogRecords = {
  given: readonly Holding[]
  closed: readonly Holding[]
  draws: readonly Draw[]
  entries: readonly LedgerEntry[]
  uses: readonly KeptUse[]
  changes: readonly (DefinitionStepRecord | ImportRecord)[]
  /** Every user reads every set change (spec: activity-log, "Set changes are events"). */
  setChanges: readonly SetChange[]
  /** Every user reads every table setting change (spec: activity-log, "Player draw mode changes are events"). */
  tableChanges: readonly TableChange[]
}

/** No records at all. */
export const EMPTY_LOG_RECORDS: LogRecords = {
  given: [],
  closed: [],
  draws: [],
  entries: [],
  uses: [],
  changes: [],
  setChanges: [],
  tableChanges: [],
}

type EventBase = {
  /** Unique and stable: React key and tie-breaker. */
  key: string
  at: EventTime
  /** The uid of the user who did it, or `null` for an import, which no user made. */
  by: string | null
}

/**
 * One thing that happened, derived from the records. A transfer is one event for both of its holdings, keyed by
 * the old one. When only one side is among the records (a filter or a page boundary cut the other), `from` or
 * `to` is `null`, and `missingHoldingId` names the holding to read for it. A draw is one event for the draw, its
 * holding and its payment. A pack opening is one event for the pack, its holdings, its payment and its refund, at
 * the time it was opened; it changes as the pack goes on. A True Word draft is likewise one event for the draft, its
 * learned word, its payment and its refund. A word the DM teaches, and a word the DM takes back, are events too, and
 * so is each use of a word or a card kept on use, with its payment. So is each definition change record: a DM step on a
 * card or a word, or an import's additions. And so is each change of a table setting by the DM.
 */
export type LogEvent =
  | (EventBase & { kind: 'given' | 'used' | 'discarded'; holding: Holding })
  | (EventBase & {
      kind: 'transferred'
      cardName: string
      /** The old holding, closed as transferred. */
      from: Holding | null
      /** The new holding, given via transfer. */
      to: Holding | null
      missingHoldingId: string | null
    })
  | (EventBase & { kind: 'drawn'; draw: CardDraw })
  | (EventBase & { kind: 'pack'; pack: PackOpening })
  | (EventBase & { kind: 'balance'; entry: LedgerEntry })
  | (EventBase & { kind: 'wordDraft'; draft: WordDraft })
  | (EventBase & { kind: 'wordTaught' | 'wordTakenBack'; record: LearnedWord })
  | (EventBase & { kind: 'wordUsed' | 'keptUsed'; use: KeptUse })
  | (EventBase & { kind: 'definition'; change: DefinitionStepRecord })
  | (EventBase & { kind: 'import'; change: ImportRecord })
  | (EventBase & { kind: 'set'; change: SetChange })
  | (EventBase & { kind: 'tableSetting'; change: TableChange })

type TransferEvent = Extract<LogEvent, { kind: 'transferred' }>

/** Newest first. A pending time is the newest of all. Equal times go by key, so the order is stable. */
export function compareEvents(a: LogEvent, b: LogEvent): number {
  if (a.at === null || b.at === null) {
    if (a.at !== b.at) return a.at === null ? -1 : 1
  } else {
    const byTime = b.at.toMillis() - a.at.toMillis()
    if (byTime !== 0) return byTime
  }
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

function transferEvent(from: Holding | null, to: Holding | null): TransferEvent {
  const side = from ?? to
  if (!side) throw new Error('A transfer needs at least one of its holdings')
  return {
    kind: 'transferred',
    key: `transferred:${from?.id ?? to?.transferredFrom ?? side.id}`,
    at: from?.returnedAt ?? to?.givenAt ?? null,
    by: from?.returnedBy ?? to?.givenBy ?? side.givenBy,
    cardName: side.cardName,
    from,
    to,
    missingHoldingId:
      from === null ? (to?.transferredFrom ?? null) : to === null ? from.transferredTo : null,
  }
}

/**
 * Every event of the records, merged: one per action, a transfer once, a draw once, a pack once, a draft once. The holdings and
 * entries of draws and packs are not among the records (see `logQueries`); a drawn or chosen card's later use,
 * discard or transfer is its own event. Not sorted.
 */
export function deriveEvents(records: LogRecords): LogEvent[] {
  const events = new Map<string, LogEvent>()
  const addTransfer = (from: Holding | null, to: Holding | null) => {
    const next = transferEvent(from, to)
    const known = events.get(next.key)
    if (known?.kind === 'transferred') {
      events.set(next.key, transferEvent(known.from ?? from, known.to ?? to))
    } else {
      events.set(next.key, next)
    }
  }

  for (const holding of records.given) {
    if (holding.givenVia === 'transfer') addTransfer(null, holding)
    else if (holding.cardKind === 'trueWord') {
      // A True Word the DM taught (design D10 of unify-cards-and-true-words): never a card given.
      addWordEvent(events, 'wordTaught', learnedWordOf(holding))
    } else {
      events.set(`given:${holding.id}`, {
        kind: 'given',
        key: `given:${holding.id}`,
        at: holding.givenAt,
        by: holding.givenBy,
        holding,
      })
    }
  }
  for (const holding of records.closed) {
    const reason = holding.returnReason
    if (reason === 'transferred') addTransfer(holding, null)
    else if (holding.cardKind === 'trueWord') {
      // A True Word's holding closes only when the DM takes the word back.
      if (reason === 'discarded') addWordEvent(events, 'wordTakenBack', learnedWordOf(holding))
    } else if (reason !== null) {
      events.set(`${reason}:${holding.id}`, {
        kind: reason,
        key: `${reason}:${holding.id}`,
        at: holding.returnedAt,
        by: holding.returnedBy ?? holding.uid,
        holding,
      })
    }
  }
  for (const draw of records.draws) {
    events.set(eventOfDraw(draw).key, eventOfDraw(draw))
  }
  for (const entry of records.entries) {
    events.set(`balance:${entry.id}`, {
      kind: 'balance',
      key: `balance:${entry.id}`,
      at: entry.at,
      by: entry.by,
      entry,
    })
  }
  for (const use of records.uses) {
    const kind = use.cardKind === 'trueWord' ? 'wordUsed' : 'keptUsed'
    const key = `${kind}:${use.id}`
    events.set(key, { kind, key, at: use.at, by: use.by, use })
  }
  for (const change of records.changes) {
    const key = `definition:${change.id}`
    events.set(
      key,
      change.step === 'imported'
        ? { kind: 'import', key, at: change.at, by: null, change }
        : { kind: 'definition', key, at: change.at, by: change.by, change },
    )
  }
  for (const change of records.setChanges) {
    const key = `set:${change.id}`
    events.set(key, { kind: 'set', key, at: change.at, by: change.by, change })
  }
  for (const change of records.tableChanges) {
    const key = `tableSetting:${change.id}`
    events.set(key, { kind: 'tableSetting', key, at: change.at, by: change.by, change })
  }
  return [...events.values()]
}

/** A word the DM taught, by the time it was taught, or took back, by the time it was taken back. */
function addWordEvent(
  events: Map<string, LogEvent>,
  kind: 'wordTaught' | 'wordTakenBack',
  record: LearnedWord,
) {
  const key = `${kind}:${record.id}`
  events.set(key, {
    kind,
    key,
    at: kind === 'wordTaught' ? record.learnedAt : record.removedAt,
    by: kind === 'wordTaught' ? record.learnedBy : (record.removedBy ?? record.learnedBy),
    record,
  })
}

/** A draw's event, a pack opening's, or a True Word draft's, at the time it was drawn, opened or started. */
function eventOfDraw(draw: Draw): LogEvent {
  switch (draw.kind) {
    case 'pack':
      return { kind: 'pack', key: `pack:${draw.id}`, at: draw.at, by: draw.by, pack: draw }
    case 'wordDraft':
      return {
        kind: 'wordDraft',
        key: `wordDraft:${draw.id}`,
        at: draw.at,
        by: draw.by,
        draft: draw,
      }
    default:
      return { kind: 'drawn', key: `drawn:${draw.id}`, at: draw.at, by: draw.by, draw }
  }
}

/**
 * The `limit` newest events of the records, and whether older ones may exist. Exact as long as each source holds
 * its own `limit` newest records: every record is one event (a transfer's two holdings are one), so the newest
 * events overall are always among them.
 */
export function newestEvents(
  records: LogRecords,
  limit: number,
): { events: LogEvent[]; mayHaveMore: boolean } {
  const events = deriveEvents(records).sort(compareEvents)
  const mayHaveMore =
    records.given.length >= limit ||
    records.closed.length >= limit ||
    records.draws.length >= limit ||
    records.entries.length >= limit ||
    records.uses.length >= limit ||
    records.changes.length >= limit ||
    records.setChanges.length >= limit ||
    records.tableChanges.length >= limit
  return { events: events.slice(0, limit), mayHaveMore }
}

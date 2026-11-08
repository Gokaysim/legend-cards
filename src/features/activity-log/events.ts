import type { LedgerEntry } from '@/features/balances/schema'
import type { Draw } from '@/features/draws/schema'
import type { Holding } from '@/features/hands/schema'

/** A server time, or `null` while it is pending in the local snapshot. */
export type EventTime = Holding['givenAt']

/**
 * The records the log is read from, each source newest first and limited to the same `n`:
 * holdings by the time they were given, closed holdings by the time they were closed, draws, and ledger entries.
 */
export type LogRecords = {
  given: readonly Holding[]
  closed: readonly Holding[]
  draws: readonly Draw[]
  entries: readonly LedgerEntry[]
}

type EventBase = {
  /** Unique and stable: React key and tie-breaker. */
  key: string
  at: EventTime
  /** The uid of the user who did it. */
  by: string
}

/**
 * One thing that happened, derived from the records. A transfer is one event for both of its holdings, keyed by
 * the old one. When only one side is among the records (a filter or a page boundary cut the other), `from` or
 * `to` is `null`, and `missingHoldingId` names the holding to read for it. A draw is one event for the draw, its
 * holding and its payment.
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
  | (EventBase & { kind: 'drawn'; draw: Draw })
  | (EventBase & { kind: 'balance'; entry: LedgerEntry })

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
 * Every event of the records, merged: one per action, a transfer once, a draw once. A drawn holding and a draw
 * payment are part of their draw's event, so they make none of their own; the drawn card's later use, discard or
 * transfer is its own event. Not sorted.
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
    if (holding.givenVia === 'draw') continue
    if (holding.givenVia === 'transfer') addTransfer(null, holding)
    else {
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
    else if (reason !== null) {
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
    events.set(`drawn:${draw.id}`, {
      kind: 'drawn',
      key: `drawn:${draw.id}`,
      at: draw.at,
      by: draw.by,
      draw,
    })
  }
  for (const entry of records.entries) {
    if (entry.source === 'draw') continue
    events.set(`balance:${entry.id}`, {
      kind: 'balance',
      key: `balance:${entry.id}`,
      at: entry.at,
      by: entry.by,
      entry,
    })
  }
  return [...events.values()]
}

/**
 * The `limit` newest events of the records, and whether older ones may exist. Exact as long as each source holds
 * its own `limit` newest records: the newest events overall are always among them. A skipped drawn holding or
 * draw payment has the same time as its draw's event, so it never pushes an older event out of the page.
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
    records.entries.length >= limit
  return { events: events.slice(0, limit), mayHaveMore }
}

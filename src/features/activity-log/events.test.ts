import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testCard } from '@/test/cardFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'

import { deriveEvents, type LogRecords, newestEvents } from './events'

const eyes = testCard("Aboleth's Eyes")
const at = (millis: number) => Timestamp.fromMillis(millis)

const given = testHolding(eyes, 'ayla', 1000, { id: 'h-given', givenBy: 'dana' })
const used = testHolding(eyes, 'ayla', 1000, {
  id: 'h-used',
  returnedAt: at(3000),
  returnedBy: 'ayla',
  returnReason: 'used',
  usedOn: 'Thorin',
})
const discarded = testHolding(eyes, 'bora', 1000, {
  id: 'h-discarded',
  returnedAt: at(4000),
  returnedBy: 'dana',
  returnReason: 'discarded',
})
/** Ayla's holding, closed when the DM gave the card to Bora at 5000. */
const transferredFrom = testHolding(eyes, 'ayla', 1000, {
  id: 'h-old',
  returnedAt: at(5000),
  returnedBy: 'dana',
  returnReason: 'transferred',
  transferredTo: 'h-new',
})
/** Bora's holding that continues it. */
const transferredTo = testHolding(eyes, 'bora', 5000, {
  id: 'h-new',
  givenBy: 'dana',
  givenVia: 'transfer',
  transferredFrom: 'h-old',
})

const records = (parts: Partial<LogRecords>): LogRecords => ({
  given: [],
  closed: [],
  entries: [],
  ...parts,
})

describe('deriveEvents', () => {
  it('turns a holding given by the DM into a given event', () => {
    expect(deriveEvents(records({ given: [given] }))).toEqual([
      { kind: 'given', key: 'given:h-given', at: at(1000), by: 'dana', holding: given },
    ])
  })

  it('turns closed holdings into used and discarded events, by whoever closed them', () => {
    const usedWithout = { ...used, id: 'h-used-2', usedOn: null }
    const events = deriveEvents(records({ closed: [used, usedWithout, discarded] }))

    expect(events).toEqual([
      { kind: 'used', key: 'used:h-used', at: at(3000), by: 'ayla', holding: used },
      { kind: 'used', key: 'used:h-used-2', at: at(3000), by: 'ayla', holding: usedWithout },
      {
        kind: 'discarded',
        key: 'discarded:h-discarded',
        at: at(4000),
        by: 'dana',
        holding: discarded,
      },
    ])
  })

  it('makes one event of both sides of a transfer', () => {
    const events = deriveEvents(records({ given: [transferredTo], closed: [transferredFrom] }))

    expect(events).toEqual([
      {
        kind: 'transferred',
        key: 'transferred:h-old',
        at: at(5000),
        by: 'dana',
        cardName: "Aboleth's Eyes",
        from: transferredFrom,
        to: transferredTo,
        missingHoldingId: null,
      },
    ])
  })

  it('keeps a transfer when only the old side is among the records, naming the new one', () => {
    const [event] = deriveEvents(records({ closed: [transferredFrom] }))
    expect(event).toMatchObject({
      kind: 'transferred',
      key: 'transferred:h-old',
      from: transferredFrom,
      to: null,
      missingHoldingId: 'h-new',
    })
  })

  it('keeps a transfer when only the new side is among the records, naming the old one', () => {
    const [event] = deriveEvents(records({ given: [transferredTo] }))
    expect(event).toMatchObject({
      kind: 'transferred',
      key: 'transferred:h-old',
      at: at(5000),
      by: 'dana',
      from: null,
      to: transferredTo,
      missingHoldingId: 'h-old',
    })
  })

  it('turns LP and GP entries into balance events', () => {
    const lp = testLedgerEntry(6000)
    const gp = testGpEntry(7000)
    expect(deriveEvents(records({ entries: [lp, gp] }))).toEqual([
      { kind: 'balance', key: 'balance:entry-6000', at: at(6000), by: 'dm-1', entry: lp },
      { kind: 'balance', key: 'balance:entry-7000', at: at(7000), by: 'dm-1', entry: gp },
    ])
  })
})

describe('newestEvents', () => {
  const all = records({
    given: [transferredTo, given],
    closed: [transferredFrom, discarded, used],
    entries: [testLedgerEntry(6000), testGpEntry(2000)],
  })

  it('orders every source together, newest first', () => {
    const { events } = newestEvents(all, 50)
    expect(events.map((event) => event.key)).toEqual([
      'balance:entry-6000',
      'transferred:h-old',
      'discarded:h-discarded',
      'used:h-used',
      'balance:entry-2000',
      'given:h-given',
    ])
  })

  it('puts events whose server time is pending first, and orders equal times by key', () => {
    const pending = testLedgerEntry(0, { id: 'pending', at: null })
    const twin = { ...used, id: 'h-twin' }
    const { events } = newestEvents(records({ closed: [used, twin], entries: [pending] }), 50)
    expect(events.map((event) => event.key)).toEqual([
      'balance:pending',
      'used:h-twin',
      'used:h-used',
    ])
  })

  it('keeps only the first n, and says whether a source may hold more', () => {
    const { events, mayHaveMore } = newestEvents(all, 2)
    expect(events.map((event) => event.key)).toEqual(['balance:entry-6000', 'transferred:h-old'])
    expect(mayHaveMore).toBe(true)

    expect(newestEvents(all, 50).mayHaveMore).toBe(false)
    expect(newestEvents(records({ entries: [testLedgerEntry(1)] }), 1).mayHaveMore).toBe(true)
  })
})

import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testCardChange, testCardSnapshot, testImportRecord } from '@/test/definitionFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'
import { testPack } from '@/test/packFixtures'
import { testSetChange } from '@/test/setFixtures'
import { testDiceReset, testTableChange } from '@/test/tableFixtures'
import { testTrueWord, testWordDraft, testWordHolding, testWordUse } from '@/test/trueWordFixtures'

import { deriveEvents, EMPTY_LOG_RECORDS, type LogRecords, newestEvents } from './events'

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

const records = (parts: Partial<LogRecords>): LogRecords => ({ ...EMPTY_LOG_RECORDS, ...parts })

describe('deriveEvents', () => {
  it('turns a set change record into one set event, by whoever made it', () => {
    const change = testSetChange(5000)
    expect(deriveEvents(records({ setChanges: [change] }))).toEqual([
      { kind: 'set', key: `set:${change.id}`, at: change.at, by: 'dana', change },
    ])
  })

  it('counts the set changes for "Daha fazla"', () => {
    const changes = [testSetChange(1), testSetChange(2)]
    expect(newestEvents(records({ setChanges: changes }), 2).mayHaveMore).toBe(true)
  })

  it('turns a table change record into one table setting event, by the DM', () => {
    const change = testTableChange(5000)
    expect(deriveEvents(records({ tableChanges: [change] }))).toEqual([
      { kind: 'tableSetting', key: `tableSetting:${change.id}`, at: change.at, by: 'dana', change },
    ])
  })

  it('orders a mode change among the other events, and counts it for "Daha fazla"', () => {
    const change = testTableChange(6000)
    const { events } = newestEvents(records({ given: [given], tableChanges: [change] }), 50)
    expect(events.map((event) => event.kind)).toEqual(['tableSetting', 'given'])
    const changes = [testTableChange(1), testTableChange(2)]
    expect(newestEvents(records({ tableChanges: changes }), 2).mayHaveMore).toBe(true)
  })

  it('turns a dice reset into one table setting event, ordered after an earlier LP change', () => {
    const reset = testDiceReset(7000)
    const lp = testLedgerEntry(6000)
    const { events } = newestEvents(records({ entries: [lp], tableChanges: [reset] }), 50)
    expect(events).toEqual([
      {
        kind: 'tableSetting',
        key: `tableSetting:${reset.id}`,
        at: reset.at,
        by: 'dana',
        change: reset,
      },
      { kind: 'balance', key: 'balance:entry-6000', at: at(6000), by: 'dm-1', entry: lp },
    ])
  })

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

describe('draws', () => {
  const rite = testCard('Blood Rite')
  /** Ayla's paid draw of "Blood Rite" at 9000, with its holding and its payment. */
  const draw = testDraw(rite, 'ayla', 9000)
  const drawnHolding = testHolding(rite, 'ayla', 9000, {
    id: draw.holdingId,
    givenBy: 'ayla',
    givenVia: 'draw',
    drawId: draw.id,
  })

  // The queries never return a draw's holding or payment (see `logQueries`): the draw is their event.
  it('makes one event of a draw', () => {
    expect(deriveEvents(records({ draws: [draw] }))).toEqual([
      { kind: 'drawn', key: `drawn:${draw.id}`, at: at(9000), by: 'ayla', draw },
    ])
  })

  it("keeps the DM's draw and a Cursed draw as draw events, by whoever drew", () => {
    const dmDraw = testDmDraw(rite, 'bora', 3000)
    const cursed = testDraw(testCursedCard('Visions of Death'), 'ayla', 4000)
    expect(
      deriveEvents(records({ draws: [cursed, dmDraw] })).map((event) => [event.key, event.by]),
    ).toEqual([
      [`drawn:${cursed.id}`, 'ayla'],
      [`drawn:${dmDraw.id}`, 'dm-1'],
    ])
  })

  it("keeps a drawn card's later use as its own event", () => {
    const usedLater = {
      ...drawnHolding,
      returnedAt: at(10000),
      returnedBy: 'ayla',
      returnReason: 'used' as const,
    }
    const { events } = newestEvents(records({ closed: [usedLater], draws: [draw] }), 50)
    expect(events.map((event) => event.key)).toEqual([
      `used:${drawnHolding.id}`,
      `drawn:${draw.id}`,
    ])
  })

  it('counts the draws for whether older events may exist', () => {
    expect(newestEvents(records({ draws: [draw] }), 1).mayHaveMore).toBe(true)
    expect(newestEvents(records({ draws: [draw] }), 2).mayHaveMore).toBe(false)
  })
})

describe('packs', () => {
  const chosen = testPack('ayla', {
    id: 'pack-chosen',
    at: at(9000),
    revealed: [0, 1, 2, 3, 4],
    status: 'chosen',
    closedAt: at(9500),
    closedBy: 'ayla',
    chosen: { cardId: 'legend-a', cardName: 'A', cardKind: 'normal', holdingId: 'h-a' },
  })

  it('makes one event of a pack opening, at the time it was opened', () => {
    expect(deriveEvents(records({ draws: [chosen] }))).toEqual([
      { kind: 'pack', key: 'pack:pack-chosen', at: at(9000), by: 'ayla', pack: chosen },
    ])
  })

  it('keeps the page exact with packs whose holdings and refunds came later', () => {
    // A pack's holdings, payment and refund are not among the records, however late they were written, and a
    // Cursed Pack's two holdings never count twice. The DM's give at 1000 is older than both packs.
    const cancelled = testPack('bora', {
      id: 'pack-cancelled',
      at: at(8000),
      status: 'cancelled',
      closedAt: at(8800),
      closedBy: 'dana',
      refundEntryId: 'e-refund',
    })
    const { events, mayHaveMore } = newestEvents(
      records({ given: [given], draws: [chosen, cancelled] }),
      2,
    )
    expect(events.map((event) => event.key)).toEqual(['pack:pack-chosen', 'pack:pack-cancelled'])
    expect(mayHaveMore).toBe(true)
  })
})

describe('True Word events', () => {
  const abyss = testTrueWord('Abyss')
  const draft = testWordDraft('w1', 'ayla', [abyss, testTrueWord('Aid'), testTrueWord('Dragon')], {
    at: Timestamp.fromMillis(3000),
  })
  const taught = testWordHolding('r1', abyss, 'bora', { givenAt: at(1000) })
  const takenBack: typeof taught = {
    ...taught,
    returnedAt: at(5000),
    returnedBy: 'dana',
    returnReason: 'discarded',
  }

  it('makes one event per draft, per word taught, and per word taken back, at their own times', () => {
    const events = deriveEvents(
      records({ draws: [draft], given: [takenBack], closed: [takenBack] }),
    )
    expect(events.map((event) => [event.kind, event.key, event.at?.toMillis(), event.by])).toEqual([
      ['wordTaught', 'wordTaught:r1', 1000, 'dana'],
      ['wordTakenBack', 'wordTakenBack:r1', 5000, 'dana'],
      ['wordDraft', 'wordDraft:w1', 3000, 'ayla'],
    ])
  })

  it('makes no card event of a True Word holding', () => {
    const events = deriveEvents(records({ given: [taught], closed: [takenBack] }))
    expect(events.map((event) => event.kind)).toEqual(['wordTaught', 'wordTakenBack'])
  })

  it('makes one event per word use, at its time, by whoever used it, ordered among the others', () => {
    const own = testWordUse('u1', abyss, 'ayla')
    const byDm = testWordUse('u2', abyss, 'ayla', { by: 'dana', at: Timestamp.fromMillis(6000) })
    const { events } = newestEvents(records({ draws: [draft], uses: [own, byDm] }), 50)
    expect(events.map((event) => [event.kind, event.key, event.at?.toMillis(), event.by])).toEqual([
      ['wordUsed', 'wordUsed:u2', 6000, 'dana'],
      ['wordUsed', 'wordUsed:u1', 4000, 'ayla'],
      ['wordDraft', 'wordDraft:w1', 3000, 'ayla'],
    ])
  })

  it('makes each use of a card kept on use its own "keptUsed" event', () => {
    const kept = (id: string, millis: number) => ({
      ...testWordUse(id, abyss, 'ayla', { at: at(millis) }),
      cardId: eyes.id,
      cardName: eyes.name,
      cardKind: 'normal' as const,
    })
    const { events } = newestEvents(records({ uses: [kept('u3', 7000), kept('u4', 8000)] }), 50)
    expect(events.map((event) => event.key)).toEqual(['keptUsed:u4', 'keptUsed:u3'])
  })

  it('may have more when a True Words source is full', () => {
    expect(newestEvents(records({ uses: [testWordUse('u1', abyss, 'ayla')] }), 1).mayHaveMore).toBe(
      true,
    )
    expect(newestEvents(records({ draws: [draft] }), 1).mayHaveMore).toBe(true)
    expect(newestEvents(records({ given: [taught] }), 1).mayHaveMore).toBe(true)
    expect(newestEvents(records({ closed: [takenBack] }), 1).mayHaveMore).toBe(true)
    expect(newestEvents(records({ draws: [draft] }), 2).mayHaveMore).toBe(false)
  })
})

describe('definition changes', () => {
  const eyes = testCardSnapshot("Aboleth's Eyes")

  it('makes one event of each change record, by the DM, and of an import, by no user', () => {
    const edit = testCardChange(
      'c1',
      eyes,
      { ...eyes, cost: '3' },
      { at: Timestamp.fromMillis(3000) },
    )
    const imported = testImportRecord('i1', 742, { at: Timestamp.fromMillis(2000) })
    const events = deriveEvents(records({ changes: [edit, imported] }))
    expect(events.map((event) => [event.kind, event.key, event.by])).toEqual([
      ['definition', 'definition:c1', 'dana'],
      ['import', 'definition:i1', null],
    ])
  })

  it('makes one import event of each picture import record, public or DM-only', () => {
    const shown = testImportRecord('p1', 700, { what: 'pictures', at: Timestamp.fromMillis(2000) })
    const drafts = testImportRecord('p2', 1, {
      what: 'pictures',
      public: false,
      items: [
        {
          id: 'legend-thecartographer',
          name: 'The Cartographer',
          status: 'draft',
          isInLibrary: true,
        },
      ],
      at: Timestamp.fromMillis(2000),
    })
    const events = deriveEvents(records({ changes: [shown, drafts] }))
    expect(events.map((event) => [event.kind, event.key, event.by])).toEqual([
      ['import', 'definition:p1', null],
      ['import', 'definition:p2', null],
    ])
  })

  it('counts the changes when deciding whether older events may exist', () => {
    const changes = [testCardChange('c1', eyes, eyes), testCardChange('c2', eyes, eyes)]
    expect(newestEvents(records({ changes }), 2).mayHaveMore).toBe(true)
    expect(newestEvents(records({ changes }), 3).mayHaveMore).toBe(false)
  })
})

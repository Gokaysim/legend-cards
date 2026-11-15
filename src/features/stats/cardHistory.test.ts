import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testPack } from '@/test/packFixtures'
import { ABOLETH, abolethHistory, in2026, packShowing, STATS_NOW } from '@/test/statsFixtures'

import {
  averageHeldDays,
  cardStats,
  DAY_MS,
  heldDays,
  historyRows,
  type CardRecords,
} from './cardHistory'

const card = ABOLETH
const other = testCard("Celal's Gambit")
const at = in2026
const ts = (millis: number) => Timestamp.fromMillis(millis)
const NOW = STATS_NOW
const richHistory = abolethHistory
const packWith = (position: number, overrides: Parameters<typeof testPack>[1] = {}) =>
  packShowing(card, position, overrides)

const noRecords: CardRecords = { holdings: [], draws: [], packs: [] }

describe('cardStats: how a card reached a hand', () => {
  it('counts a transfer apart, not as another "Ele geçti"', () => {
    const stats = cardStats(card.id, richHistory(), NOW)
    expect(stats.reached).toEqual({ dm: 1, draw: 1, pack: 1, total: 3 })
    expect(stats.transferred).toBe(1)
    expect(stats.holdings).toBe(4)
  })

  it('counts each copy of a Blessed card', () => {
    const blessed = testBlessedCard('Second Wind')
    const copy = (uid: string) =>
      testHolding(blessed, uid, at(11, 1), { givenVia: 'draw', drawId: `draw-${uid}` })
    const stats = cardStats(blessed.id, { holdings: [copy('ayla'), copy('bora')], packs: [] }, NOW)
    expect(stats.reached).toEqual({ dm: 0, draw: 2, pack: 0, total: 2 })
    expect(stats.holders).toEqual(['ayla', 'bora'])
  })

  it('leaves out the holdings of other cards', () => {
    const stats = cardStats(
      card.id,
      { holdings: [testHolding(other, 'ayla', at(11, 1))], packs: [] },
      NOW,
    )
    expect(stats.reached.total).toBe(0)
    expect(stats.holdings).toBe(0)
  })
})

describe('cardStats: how a card left a hand', () => {
  it('counts two uses and the LP paid for them', () => {
    const stats = cardStats(card.id, richHistory(), NOW)
    expect(stats.used).toBe(2)
    expect(stats.lpPaid).toBe(2)
    expect(stats.lastUsedAt).toBe(at(11, 14, 21, 40))
    expect(stats.firstHeldAt).toBe(at(10, 20, 19, 45))
  })

  it('counts a use recorded without a payment as 0 LP', () => {
    const used = testHolding(card, 'ayla', at(11, 1), {
      returnedAt: ts(at(11, 2)),
      returnedBy: 'ayla',
      returnReason: 'used',
    })
    const stats = cardStats(card.id, { holdings: [used], packs: [] }, NOW)
    expect(stats.used).toBe(1)
    expect(stats.lpPaid).toBe(0)
  })

  it('counts a discard', () => {
    const stats = cardStats(card.id, richHistory(), NOW)
    expect(stats.discarded).toBe(1)
  })
})

describe('cardStats: cards shown in packs', () => {
  it('counts a pack that turned the card and chose another as shown, not taken', () => {
    const pack = packWith(1, {
      revealed: [0, 1, 2, 3, 4],
      status: 'chosen',
      closedAt: ts(at(11, 9)),
      closedBy: 'bora',
      chosen: { cardId: 'legend-a', cardName: 'A', cardKind: 'normal', holdingId: 'h' },
    })
    const stats = cardStats(card.id, { holdings: [], packs: [pack] }, NOW)
    expect(stats.shown).toBe(1)
    expect(stats.taken).toBe(0)
  })

  it('does not count a position never turned', () => {
    const pack = packWith(2, {
      revealed: [0, 1],
      status: 'cancelled',
      closedAt: ts(at(11, 9)),
      closedBy: 'dm-1',
      refundEntryId: 'refund-1',
    })
    expect(cardStats(card.id, { holdings: [], packs: [pack] }, NOW).shown).toBe(0)
  })

  it('counts a turned card of an open pack and of a cancelled pack', () => {
    const open = packWith(0, { id: 'open', revealed: [0] })
    const cancelled = packWith(3, {
      id: 'cancelled',
      revealed: [0, 1, 2, 3],
      status: 'cancelled',
      closedAt: ts(at(11, 9)),
      closedBy: 'dm-1',
      refundEntryId: 'refund-1',
    })
    const stats = cardStats(card.id, { holdings: [], packs: [open, cancelled] }, NOW)
    expect(stats.shown).toBe(2)
    expect(stats.taken).toBe(0)
  })

  it("counts a chosen Cursed Pack's Cursed card as reaching the hand through the pack", () => {
    const curse = testCursedCard('Abandon All Hope')
    const pack = testPack('ayla', {
      packType: 'cursed',
      offered: ['legend-a', 'legend-b', 'legend-c', 'legend-d', 'legend-e', curse.id],
      revealed: [0, 1, 2, 3, 4, 5],
      status: 'chosen',
      closedAt: ts(at(11, 9)),
      closedBy: 'ayla',
      chosen: { cardId: 'legend-a', cardName: 'A', cardKind: 'normal', holdingId: 'h-a' },
      cursed: { cardId: curse.id, cardName: curse.name, holdingId: 'h-curse' },
    })
    const holding = testHolding(curse, 'ayla', at(11, 9), {
      id: 'h-curse',
      givenBy: 'ayla',
      givenVia: 'pack',
      drawId: pack.id,
    })
    const stats = cardStats(curse.id, { holdings: [holding], packs: [pack] }, NOW)
    expect(stats.reached).toEqual({ dm: 0, draw: 0, pack: 1, total: 1 })
    expect(stats.shown).toBe(1)
    expect(stats.taken).toBe(1)
  })
})

describe('cardStats: time in hands', () => {
  it('adds up four stays of 4, 5, 3 and 2 days: 14 days, 3.5 on average', () => {
    let start = at(10, 1)
    const holdings = [4, 5, 3, 2].map((days, index) => {
      const holding = testHolding(card, 'ayla', start, {
        id: `h-${index}`,
        returnedAt: ts(start + days * DAY_MS),
        returnedBy: 'ayla',
        returnReason: 'used',
      })
      start += (days + 1) * DAY_MS
      return holding
    })
    const stats = cardStats(card.id, { holdings, packs: [] }, NOW)
    expect(heldDays(stats)).toBe(14)
    expect(averageHeldDays(stats)).toBe(3.5)
  })

  it('counts an open holding up to now', () => {
    const holding = testHolding(card, 'ayla', NOW - 3 * DAY_MS - 60_000)
    expect(heldDays(cardStats(card.id, { holdings: [holding], packs: [] }, NOW))).toBe(3)
  })

  it('counts a holding whose give is still pending as given now', () => {
    const holding = testHolding(card, 'ayla', 0, { givenAt: null })
    const stats = cardStats(card.id, { holdings: [holding], packs: [] }, NOW)
    expect(stats.heldMs).toBe(0)
    expect(stats.firstHeldAt).toBe(NOW)
  })

  it('has no days for a card never held', () => {
    const stats = cardStats(card.id, noRecords, NOW)
    expect(heldDays(stats)).toBeNull()
    expect(averageHeldDays(stats)).toBeNull()
    expect(stats.lastUsedAt).toBeNull()
  })
})

describe('historyRows', () => {
  it('lists what happened, newest first', () => {
    const rows = historyRows(card.id, richHistory())
    expect(
      rows.map((row) => `${row.kind}:${'holding' in row ? row.holding.id : row.pack.id}`),
    ).toEqual([
      'used:h-pack',
      'fromPack:h-pack',
      'seen:pack-standard',
      'discarded:h-transfer',
      'transferred:h-draw',
      'drawn:h-draw',
      'used:h-dm',
      'given:h-dm',
    ])
  })

  it('makes a transfer one row, from the holding it closed, naming the receiver', () => {
    const rows = historyRows(card.id, richHistory())
    const transfers = rows.filter((row) => row.kind === 'transferred')
    expect(transfers).toHaveLength(1)
    expect(transfers[0]).toMatchObject({ holding: { uid: 'bora' }, receiver: { uid: 'ayla' } })
    expect(
      rows.some(
        (row) => 'holding' in row && row.holding.id === 'h-transfer' && row.kind !== 'discarded',
      ),
    ).toBe(false)
  })

  it('names the draw and the pack that opened a holding', () => {
    const rows = historyRows(card.id, richHistory())
    expect(rows.find((row) => row.kind === 'drawn')).toMatchObject({ draw: { id: 'draw-bora' } })
    expect(rows.find((row) => row.kind === 'fromPack')).toMatchObject({
      pack: { id: 'pack-premium' },
    })
  })

  it('puts a row whose time is pending at the top', () => {
    const records = richHistory()
    const fresh = testHolding(card, 'bora', 0, { id: 'h-new', givenAt: null })
    const rows = historyRows(card.id, { ...records, holdings: [...records.holdings, fresh] })
    expect(rows[0]).toMatchObject({ kind: 'given', at: null })
  })

  it('has no rows for a card that nothing happened to', () => {
    expect(historyRows(card.id, noRecords)).toEqual([])
  })
})

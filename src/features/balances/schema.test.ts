import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { BALANCE_LIMITS, ledgerEntrySchema, partyPurseSchema } from './schema'

const lpEntry = {
  currency: 'lp',
  account: 'ayla',
  delta: 2,
  balanceAfter: 7,
  source: 'manual',
  reason: "Boss'u yendi",
  drawId: null,
  by: 'dm',
  at: Timestamp.fromMillis(0),
}

const drawEntry = {
  ...lpEntry,
  delta: -1,
  balanceAfter: 2,
  source: 'draw',
  reason: null,
  drawId: 'draw-1',
  by: 'ayla',
}

const gpEntry = { ...lpEntry, currency: 'gp', account: 'party', delta: -2500, balanceAfter: 10000 }

const accepts = (entry: object) => ledgerEntrySchema.safeParse(entry).success

describe('ledgerEntrySchema', () => {
  it('accepts an LP entry, a GP entry, and a pending time', () => {
    expect(accepts(lpEntry)).toBe(true)
    expect(accepts(gpEntry)).toBe(true)
    expect(accepts({ ...lpEntry, at: null })).toBe(true)
  })

  it('rejects a change of 0, a fraction, and a change over the limit', () => {
    expect(accepts({ ...lpEntry, delta: 0 })).toBe(false)
    expect(accepts({ ...lpEntry, delta: 1.5 })).toBe(false)
    expect(accepts({ ...lpEntry, delta: BALANCE_LIMITS.amount })).toBe(true)
    expect(accepts({ ...lpEntry, delta: -BALANCE_LIMITS.amount - 1 })).toBe(false)
  })

  it('rejects a negative balance', () => {
    expect(accepts({ ...lpEntry, balanceAfter: -1 })).toBe(false)
  })

  it('rejects an unknown currency or source', () => {
    expect(accepts({ ...lpEntry, currency: 'xp' })).toBe(false)
    expect(accepts({ ...lpEntry, source: 'pack' })).toBe(false)
  })

  it('reads a stored entry without drawId as a change by hand', () => {
    const { drawId: _drawId, ...stored } = lpEntry
    const result = ledgerEntrySchema.safeParse(stored)
    expect(result.success && result.data.drawId).toBeNull()
  })

  it('accepts a draw payment: no reason, its draw, and LP', () => {
    expect(accepts(drawEntry)).toBe(true)
  })

  it.each([
    ['a change by hand without a reason', { ...lpEntry, reason: null }],
    ['a change by hand that names a draw', { ...lpEntry, drawId: 'draw-1' }],
    ['a draw payment with a reason', { ...drawEntry, reason: 'Kart çekme' }],
    ['a draw payment without its draw', { ...drawEntry, drawId: null }],
    ['a draw payment in GP', { ...drawEntry, currency: 'gp', account: 'party' }],
    ['an empty draw ID', { ...drawEntry, drawId: '' }],
  ])('rejects %s', (_case, entry) => {
    expect(accepts(entry)).toBe(false)
  })

  it('rejects an empty or over-long reason', () => {
    expect(accepts({ ...lpEntry, reason: '' })).toBe(false)
    expect(accepts({ ...lpEntry, reason: 'x'.repeat(BALANCE_LIMITS.reason) })).toBe(true)
    expect(accepts({ ...lpEntry, reason: 'x'.repeat(BALANCE_LIMITS.reason + 1) })).toBe(false)
  })

  it('keeps GP with the party and LP with a player', () => {
    expect(accepts({ ...lpEntry, account: 'party' })).toBe(false)
    expect(accepts({ ...gpEntry, account: 'ayla' })).toBe(false)
  })
})

describe('partyPurseSchema', () => {
  it('accepts a purse and rejects a negative or fractional amount', () => {
    expect(partyPurseSchema.safeParse({ gp: 12500, gpEntryId: 'e1' }).success).toBe(true)
    expect(partyPurseSchema.safeParse({ gp: -1, gpEntryId: 'e1' }).success).toBe(false)
    expect(partyPurseSchema.safeParse({ gp: 0.5, gpEntryId: 'e1' }).success).toBe(false)
  })
})

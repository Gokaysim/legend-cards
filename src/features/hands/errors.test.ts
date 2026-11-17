import { describe, expect, it } from 'vitest'

import { TableBusyError } from '@/features/table/errors'

import { HoldingError, holdingFailureMessage, toHoldingFailure } from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

describe('toHoldingFailure', () => {
  it('maps holding errors, a denial while a pack is open, and Firebase codes', () => {
    expect(toHoldingFailure(new HoldingError('taken', { holderUid: 'bora' }))).toEqual({
      kind: 'taken',
      holderUid: 'bora',
    })
    expect(toHoldingFailure(new HoldingError('closed'))).toEqual({ kind: 'closed' })
    expect(toHoldingFailure(new TableBusyError('pack-1'))).toEqual({ kind: 'table-busy' })
    expect(toHoldingFailure(firebaseError('permission-denied'))).toEqual({
      kind: 'permission-denied',
    })
    expect(toHoldingFailure(firebaseError('unavailable'))).toEqual({ kind: 'offline' })
    expect(toHoldingFailure('boom')).toEqual({ kind: 'unknown' })
  })
})

describe('toHoldingFailure for uses', () => {
  it('maps the payment errors with their amounts', () => {
    expect(
      toHoldingFailure(new HoldingError('insufficient', { shortfall: { balance: 1, amount: 3 } })),
    ).toEqual({ kind: 'insufficient', balance: 1, amount: 3 })
    expect(toHoldingFailure(new HoldingError('price-changed', { price: 4 }))).toEqual({
      kind: 'price-changed',
      price: 4,
    })
    expect(toHoldingFailure(new HoldingError('invalid-amount'))).toEqual({ kind: 'invalid-amount' })
    expect(toHoldingFailure(new HoldingError('no-profile'))).toEqual({ kind: 'no-profile' })
  })
})

describe('holdingFailureMessage', () => {
  it("names the price and the holder's LP when a use cannot be paid", () => {
    expect(
      holdingFailureMessage(
        { kind: 'insufficient', balance: 1, amount: 3 },
        { holderName: 'Ayla' },
      ),
    ).toBe("Bu kullanım 3 LP tutuyor; Ayla'nın 1 LP'si var.")
    expect(holdingFailureMessage({ kind: 'price-changed', price: 4 })).toBe(
      'Kartın bedeli değişti: şimdi 4 LP. Yeni bedelle tekrar onayla.',
    )
  })

  it('says that the table waits for an open pack', () => {
    expect(holdingFailureMessage({ kind: 'table-busy' })).toBe(
      'Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler.',
    )
  })
})

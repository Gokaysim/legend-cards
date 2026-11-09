import { describe, expect, it } from 'vitest'

import { TableBusyError } from '@/features/table/errors'

import { BalanceError, balanceFailureMessage, toBalanceFailure } from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

describe('toBalanceFailure', () => {
  it('maps balance errors, a denial while a pack is open, and Firebase codes', () => {
    expect(toBalanceFailure(new BalanceError('insufficient', 3))).toEqual({
      kind: 'insufficient',
      balance: 3,
    })
    expect(toBalanceFailure(new TableBusyError('pack-1'))).toEqual({ kind: 'table-busy' })
    expect(toBalanceFailure(firebaseError('permission-denied'))).toEqual({
      kind: 'permission-denied',
    })
    expect(toBalanceFailure(firebaseError('unavailable'))).toEqual({ kind: 'offline' })
  })
})

describe('balanceFailureMessage', () => {
  it('says that the table waits for an open pack', () => {
    expect(balanceFailureMessage({ kind: 'table-busy' }, { currency: 'gp' }, 2500)).toBe(
      'Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler.',
    )
  })
})

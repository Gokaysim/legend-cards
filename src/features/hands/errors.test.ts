import { describe, expect, it } from 'vitest'

import { TableBusyError } from '@/features/table/errors'

import { HoldingError, holdingFailureMessage, toHoldingFailure } from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

describe('toHoldingFailure', () => {
  it('maps holding errors, a denial while a pack is open, and Firebase codes', () => {
    expect(toHoldingFailure(new HoldingError('taken', 'bora'))).toEqual({
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

describe('holdingFailureMessage', () => {
  it('says that the table waits for an open pack', () => {
    expect(holdingFailureMessage({ kind: 'table-busy' })).toBe(
      'Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler.',
    )
  })
})

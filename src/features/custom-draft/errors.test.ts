import { FirebaseError } from 'firebase/app'
import { describe, expect, it } from 'vitest'

import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'

import { CustomDraftError, customDraftFailureMessage, toCustomDraftFailure } from './errors'

describe('toCustomDraftFailure', () => {
  it('names the shortfall of an insufficient balance', () => {
    const failure = toCustomDraftFailure(
      new CustomDraftError('insufficient', { balance: 2, amount: 3 }),
    )
    expect(failure).toEqual({ kind: 'insufficient', balance: 2, amount: 3 })
    expect(customDraftFailureMessage(failure, 'Ayla')).toBe(
      "Bu draft 3 LP tutuyor; Ayla'nın 2 LP'si var.",
    )
  })

  it('explains an open pack, a lost connection and a denial', () => {
    expect(customDraftFailureMessage(toCustomDraftFailure(new TableBusyError('p')), 'Ayla')).toBe(
      TABLE_BUSY_MESSAGE,
    )
    const offline = toCustomDraftFailure(new FirebaseError('unavailable', 'offline'))
    expect(offline).toEqual({ kind: 'offline' })
    expect(customDraftFailureMessage(offline, 'Ayla')).toMatch(/^Bağlantı yok/)
    expect(toCustomDraftFailure(new FirebaseError('permission-denied', 'no'))).toEqual({
      kind: 'permission-denied',
    })
  })

  it('has a Turkish message for every kind', () => {
    for (const kind of [
      'no-effects',
      'no-profile',
      'invalid-amount',
      'draft-open',
      'closed',
      'invalid-choice',
      'incomplete-texts',
    ] as const) {
      expect(customDraftFailureMessage({ kind }, 'Ayla')).not.toBe('')
    }
  })
})

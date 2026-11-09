import { FirebaseError } from 'firebase/app'
import { describe, expect, it } from 'vitest'

import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'

import { toWordFailure, WordError, type WordFailure, wordFailureMessage } from './errors'

describe('toWordFailure', () => {
  it('keeps the kind of a WordError, with the shortfall of an insufficient one', () => {
    expect(toWordFailure(new WordError('too-few-words'))).toEqual({ kind: 'too-few-words' })
    expect(toWordFailure(new WordError('insufficient', { balance: 2, amount: 4 }))).toEqual({
      kind: 'insufficient',
      balance: 2,
      amount: 4,
    })
  })

  it('reads an insufficient error without its shortfall as unknown', () => {
    expect(toWordFailure(new WordError('insufficient'))).toEqual({ kind: 'unknown' })
  })

  it('reads a table that waits for a pack as table-busy', () => {
    expect(toWordFailure(new TableBusyError('p1'))).toEqual({ kind: 'table-busy' })
  })

  it('maps Firebase errors', () => {
    expect(toWordFailure(new FirebaseError('permission-denied', 'no'))).toEqual({
      kind: 'permission-denied',
    })
    expect(toWordFailure(new FirebaseError('unavailable', 'offline'))).toEqual({ kind: 'offline' })
    expect(toWordFailure(new Error('boom'))).toEqual({ kind: 'unknown' })
  })
})

describe('wordFailureMessage', () => {
  it.each<[WordFailure, string]>([
    [{ kind: 'too-few-words' }, 'Draft için en az 3 öğrenilmemiş True Word gerekli.'],
    [
      { kind: 'insufficient', balance: 2, amount: 4 },
      "Bu draft 4 LP tutuyor; Ayla'nın 2 LP'si var.",
    ],
    [{ kind: 'draft-open' }, "Ayla'nın açık bir draft'ı var: önce onu bitir."],
    [{ kind: 'word-known' }, "Ayla bu True Word'ü zaten biliyor."],
    [{ kind: 'table-busy' }, TABLE_BUSY_MESSAGE],
    [{ kind: 'offline' }, 'Bağlantı yok: True Word işlemleri için internet bağlantısı gerekiyor.'],
  ])('explains %j in Turkish', (failure, message) => {
    expect(wordFailureMessage(failure, 'Ayla')).toBe(message)
  })

  it('has a message for every failure', () => {
    const kinds: WordFailure['kind'][] = [
      'too-few-words',
      'not-a-player',
      'invalid-amount',
      'draft-open',
      'retries-exhausted',
      'closed',
      'invalid-choice',
      'word-known',
      'unavailable',
      'not-known',
      'table-busy',
      'offline',
      'permission-denied',
      'unknown',
    ]
    for (const kind of kinds) {
      expect(wordFailureMessage({ kind } as WordFailure, 'Bora')).not.toBe('')
    }
  })
})

import { describe, expect, it } from 'vitest'

import { PackError, type PackFailure, packFailureMessage, toPackFailure } from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

describe('toPackFailure', () => {
  it('maps pack errors', () => {
    expect(toPackFailure(new PackError('busy'))).toEqual({ kind: 'busy' })
    expect(toPackFailure(new PackError('not-all-turned'))).toEqual({ kind: 'not-all-turned' })
    expect(
      toPackFailure(new PackError('insufficient', { currency: 'gp', balance: 5000, amount: 7500 })),
    ).toEqual({ kind: 'insufficient', currency: 'gp', balance: 5000, amount: 7500 })
  })

  it('maps Firebase errors by their code', () => {
    expect(toPackFailure(firebaseError('unavailable'))).toEqual({ kind: 'offline' })
    expect(toPackFailure(firebaseError('permission-denied'))).toEqual({ kind: 'permission-denied' })
    expect(toPackFailure('boom')).toEqual({ kind: 'unknown' })
  })
})

describe('packFailureMessage', () => {
  const names = { owner: 'Ayla', openPackOwner: 'Bora' }

  it.each<[PackFailure, string]>([
    [{ kind: 'busy' }, 'Şu anda Bora bir Pack açıyor. Seçim yapılınca tekrar dene.'],
    [
      { kind: 'insufficient', currency: 'lp', balance: 1, amount: 2 },
      "Bu Pack için 2 LP gerekiyor; Ayla'nın 1 LP'si var.",
    ],
    [
      { kind: 'insufficient', currency: 'gp', balance: 5000, amount: 7500 },
      'Bu Pack için 7.500 GP gerekiyor; grup kesesinde 5.000 GP var.',
    ],
    [{ kind: 'closed' }, 'Bu Pack artık açık değil.'],
    [{ kind: 'not-all-turned' }, 'Önce bütün kartları çevir.'],
    [{ kind: 'invalid-choice' }, 'Bu kart seçilemez.'],
    [
      { kind: 'unavailable' },
      'Bu kart artık seçilemiyor. Başka bir kart seç ya da DM iptal etsin.',
    ],
    [
      { kind: 'retries-exhausted' },
      'Pack açılamadı: kartlar o sırada başka ellere geçti. Tekrar dene.',
    ],
    [{ kind: 'offline' }, 'Bağlantı yok: Pack işlemleri için internet bağlantısı gerekiyor.'],
    [{ kind: 'permission-denied' }, 'Bu işlem için yetkin yok.'],
    [{ kind: 'unknown' }, 'Pack işlemi yapılamadı. Tekrar dene.'],
  ])('explains %j in Turkish', (failure, message) => {
    expect(packFailureMessage(failure, names)).toBe(message)
  })

  it('does without the name of the open pack when it is not known', () => {
    expect(packFailureMessage({ kind: 'busy' }, { owner: 'Ayla' })).toBe(
      'Şu anda açık bir Pack var. Seçim yapılınca tekrar dene.',
    )
  })
})

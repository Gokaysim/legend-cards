import { describe, expect, it } from 'vitest'

import { TableBusyError } from '@/features/table/errors'

import { DrawError, type DrawFailure, drawFailureMessage, toDrawFailure } from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

describe('toDrawFailure', () => {
  it('maps draw errors', () => {
    expect(toDrawFailure(new DrawError('nothing-to-draw'))).toEqual({ kind: 'nothing-to-draw' })
    expect(toDrawFailure(new DrawError('insufficient', 0))).toEqual({
      kind: 'insufficient',
      lp: 0,
      price: 1,
    })
    expect(toDrawFailure(new DrawError('insufficient', 2, 3))).toEqual({
      kind: 'insufficient',
      lp: 2,
      price: 3,
    })
    expect(toDrawFailure(new DrawError('retries-exhausted'))).toEqual({
      kind: 'retries-exhausted',
    })
    expect(toDrawFailure(new DrawError('session-ended'))).toEqual({ kind: 'session-ended' })
    expect(toDrawFailure(new DrawError('mode-changed'))).toEqual({ kind: 'mode-changed' })
  })

  it('maps a denial while a pack is open', () => {
    expect(toDrawFailure(new TableBusyError('pack-1'))).toEqual({ kind: 'table-busy' })
  })

  it('maps Firebase errors by their code', () => {
    expect(toDrawFailure(firebaseError('unavailable'))).toEqual({ kind: 'offline' })
    expect(toDrawFailure(firebaseError('permission-denied'))).toEqual({
      kind: 'permission-denied',
    })
    expect(toDrawFailure(firebaseError('aborted'))).toEqual({ kind: 'unknown' })
    expect(toDrawFailure('boom')).toEqual({ kind: 'unknown' })
  })
})

describe('drawFailureMessage', () => {
  it.each<[DrawFailure, string]>([
    [{ kind: 'nothing-to-draw' }, 'Çekilebilecek kart yok.'],
    [
      { kind: 'insufficient', lp: 0, price: 1 },
      "Kart çekmek için 1 LP gerekiyor; Ayla'nın 0 LP'si var.",
    ],
    [
      { kind: 'insufficient', lp: 2, price: 3 },
      "Kart çekmek için 3 LP gerekiyor; Ayla'nın 2 LP'si var.",
    ],
    [
      { kind: 'retries-exhausted' },
      'Kart çekilemedi: kartlar o sırada başka ellere geçti. Tekrar dene.',
    ],
    [{ kind: 'session-ended' }, 'Bu çekiş bitirildi. Tekrar çekersen yeni bir çekiş başlar.'],
    [
      { kind: 'mode-changed' },
      'DM oyuncu kart çekişini değiştirdi; filtreler ve fiyat sıfırlandı.',
    ],
    [
      { kind: 'table-busy' },
      'Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler.',
    ],
    [{ kind: 'offline' }, 'Bağlantı yok: kart çekmek için internet bağlantısı gerekiyor.'],
    [{ kind: 'permission-denied' }, 'Bu işlem için yetkin yok.'],
    [{ kind: 'unknown' }, 'Kart çekilemedi. Tekrar dene.'],
  ])('explains %j in Turkish', (failure, message) => {
    expect(drawFailureMessage(failure, 'Ayla')).toBe(message)
  })

  it("follows the name's vowel harmony", () => {
    expect(drawFailureMessage({ kind: 'insufficient', lp: 0, price: 1 }, 'Cem')).toBe(
      "Kart çekmek için 1 LP gerekiyor; Cem'in 0 LP'si var.",
    )
  })
})

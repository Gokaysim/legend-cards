import { describe, expect, it } from 'vitest'

import {
  COMBAT_OFFLINE_NOTE,
  CombatChangedError,
  CombatOpenError,
  CombatPartlyAddedError,
  combatFailureMessage,
} from './errors'

const firebaseError = (code: string) => Object.assign(new Error(code), { code })

const names = new Map([
  ['thorn', 'Thorn'],
  ['elara', 'Elara'],
])
const nameOf = (id: string) => names.get(id)
const leftOut = [
  { characterId: 'thorn', uid: 'ayla' },
  { characterId: 'elara', uid: 'bora' },
]

describe('combatFailureMessage', () => {
  it('names the characters left out of a combat that opened', () => {
    expect(combatFailureMessage(new CombatPartlyAddedError('open', leftOut), nameOf)).toBe(
      'Savaş açıldı ama şu karakterler eklenemedi: Thorn, Elara. «+ Ekle» ile ekleyebilirsin.',
    )
  })

  it('names the characters left out of an addition', () => {
    expect(combatFailureMessage(new CombatPartlyAddedError('add', leftOut), nameOf)).toBe(
      'Şu karakterler eklenemedi: Thorn, Elara. «+ Ekle» ile tekrar ekleyebilirsin.',
    )
  })

  it('counts the characters left out when it cannot name them all', () => {
    const unknown = [...leftOut, { characterId: 'brom', uid: 'cem' }]
    expect(combatFailureMessage(new CombatPartlyAddedError('open', unknown), nameOf)).toBe(
      'Savaş açıldı ama 3 karakter eklenemedi. «+ Ekle» ile ekleyebilirsin.',
    )
    expect(combatFailureMessage(new CombatPartlyAddedError('add', leftOut))).toBe(
      '2 karakter eklenemedi. «+ Ekle» ile tekrar ekleyebilirsin.',
    )
  })

  it('keeps the message of every other failure', () => {
    expect(combatFailureMessage(new CombatOpenError(), nameOf)).toBe('Zaten açık bir savaş var.')
    expect(combatFailureMessage(new CombatChangedError(), nameOf)).toBe(
      'Savaş bu arada değişti. Listeye tekrar bak.',
    )
    expect(combatFailureMessage(firebaseError('permission-denied'))).toBe(
      'Bu adım şu anda yapılamaz: savaş bu arada değişmiş olabilir.',
    )
    expect(combatFailureMessage(firebaseError('unavailable'))).toBe(COMBAT_OFFLINE_NOTE)
    expect(combatFailureMessage(new Error('boom'))).toBe('Kaydedilemedi. Tekrar dene.')
  })
})

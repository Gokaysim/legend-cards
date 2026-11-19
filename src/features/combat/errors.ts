import { firebaseCode } from '@/lib/firestore/errors'

import type { JoiningCharacter } from './api'

/** "Modifier iste" while a combat is already open (spec: initiative-tracker, "One combat at a time"). */
export class CombatOpenError extends Error {
  override readonly name = 'CombatOpenError'

  constructor() {
    super('A combat is already open')
  }
}

/** A combat step that no longer fits the combat: it started, ended, or the combatant left meanwhile. */
export class CombatChangedError extends Error {
  override readonly name = 'CombatChangedError'

  constructor() {
    super('The combat changed meanwhile')
  }
}

/**
 * A combat opened, or combatants were added, but some of the chosen characters could not be (spec: initiative-tracker,
 * "A setup that is cut short"; design D3 of open-large-combats). The combat stays open with the rest.
 */
export class CombatPartlyAddedError extends Error {
  override readonly name = 'CombatPartlyAddedError'
  readonly step: 'open' | 'add'
  readonly leftOut: readonly JoiningCharacter[]

  constructor(step: 'open' | 'add', leftOut: readonly JoiningCharacter[]) {
    super(`${String(leftOut.length)} characters were left out`)
    this.step = step
    this.leftOut = leftOut
  }
}

/** The note next to a combat control that is disabled without a connection. */
export const COMBAT_OFFLINE_NOTE = 'Bağlantı yok: savaş adımları için bağlantı gerekiyor.'

/**
 * The Turkish message of a combat step that failed. `nameOf` names a character for a setup cut short; without it, or
 * for a character it does not know, the message counts them instead.
 */
export function combatFailureMessage(
  error: unknown,
  nameOf: (characterId: string) => string | undefined = () => undefined,
): string {
  if (error instanceof CombatOpenError) return 'Zaten açık bir savaş var.'
  if (error instanceof CombatPartlyAddedError) {
    const names = error.leftOut.map((c) => nameOf(c.characterId))
    const list = names.every((name) => name !== undefined)
      ? `şu karakterler eklenemedi: ${names.join(', ')}`
      : `${String(names.length)} karakter eklenemedi`
    return error.step === 'open'
      ? `Savaş açıldı ama ${list}. «+ Ekle» ile ekleyebilirsin.`
      : `${list.charAt(0).toLocaleUpperCase('tr')}${list.slice(1)}. «+ Ekle» ile tekrar ekleyebilirsin.`
  }
  if (error instanceof CombatChangedError) return 'Savaş bu arada değişti. Listeye tekrar bak.'
  switch (firebaseCode(error)) {
    case 'permission-denied':
      return 'Bu adım şu anda yapılamaz: savaş bu arada değişmiş olabilir.'
    case 'unavailable':
      return COMBAT_OFFLINE_NOTE
    default:
      return 'Kaydedilemedi. Tekrar dene.'
  }
}

/** The message of an initiative roll that played but was not recorded (design D3). */
export const ROLL_NOT_RECORDED_MESSAGE =
  'Atış kaydedilmedi: savaş bu arada başlamış ya da değişmiş olabilir.'

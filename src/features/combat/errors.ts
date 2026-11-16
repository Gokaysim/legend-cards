import { firebaseCode } from '@/lib/firestore/errors'

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

/** The note next to a combat control that is disabled without a connection. */
export const COMBAT_OFFLINE_NOTE = 'Bağlantı yok: savaş adımları için bağlantı gerekiyor.'

/** The Turkish message of a combat step that failed. */
export function combatFailureMessage(error: unknown): string {
  if (error instanceof CombatOpenError) return 'Zaten açık bir savaş var.'
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

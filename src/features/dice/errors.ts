import { firebaseCode } from '@/lib/firestore/errors'

/**
 * A dice channel reset that failed after part of its deletes reached the server (spec: dice-rolls, "A reset needs a
 * connection"). The record of the reset is stored; a new reset deletes the rolls left.
 */
export class DiceResetIncompleteError extends Error {
  override readonly name = 'DiceResetIncompleteError'

  constructor(cause: unknown) {
    super('The dice channel reset stopped part way', { cause })
  }
}

/** The message of a dice channel reset tried without a connection. Nothing was deleted. */
export const DICE_RESET_OFFLINE_MESSAGE =
  'Bağlantı yok: zar kanalını sıfırlamak için internet bağlantısı gerekiyor.'

/** The message of a dice channel reset, or of counting its rolls, that failed. */
export function diceResetFailureMessage(error: unknown): string {
  if (error instanceof DiceResetIncompleteError) return 'Bazı atışlar silinemedi; tekrar dene.'
  switch (firebaseCode(error)) {
    case 'permission-denied':
      return 'Zar kanalını yalnızca DM sıfırlayabilir.'
    case 'unavailable':
      return DICE_RESET_OFFLINE_MESSAGE
    default:
      return 'Zar kanalı sıfırlanamadı. Tekrar dene.'
  }
}

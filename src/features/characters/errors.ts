import { firebaseCode } from '@/lib/firestore/errors'

/**
 * A new photo was chosen without a connection (spec: characters, "Characters without a connection"). Thrown before
 * anything is uploaded or written.
 */
export class PhotoNeedsConnectionError extends Error {
  override readonly name = 'PhotoNeedsConnectionError'

  constructor() {
    super('A photo needs a connection')
  }
}

/**
 * The character chosen for a use is missing or archived (spec: card-holdings, "The character of a use is recorded").
 * Thrown inside a use's transaction before anything is written.
 */
export class CharacterUnavailableError extends Error {
  override readonly name = 'CharacterUnavailableError'

  constructor() {
    super('The chosen character is no longer available')
  }
}

/** Why a character step failed, as the interface explains it. */
export type CharacterFailure =
  | { kind: 'photo-offline' }
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a character step can throw to a failure the interface explains. */
export function toCharacterFailure(error: unknown): CharacterFailure {
  if (error instanceof PhotoNeedsConnectionError) return { kind: 'photo-offline' }
  switch (firebaseCode(error)) {
    case 'permission-denied':
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return { kind: 'permission-denied' }
    case 'unavailable':
    case 'storage/retry-limit-exceeded':
      return { kind: 'offline' }
    default:
      return { kind: 'unknown' }
  }
}

/** The Turkish message for a failure. */
export function characterFailureMessage(failure: CharacterFailure): string {
  switch (failure.kind) {
    case 'photo-offline':
      return 'Fotoğraf yüklemek için bağlantı gerekiyor. Bağlantı gelince tekrar kaydet.'
    case 'offline':
      return 'Bağlantı yok: fotoğraf yüklenemedi. Bağlantı gelince tekrar kaydet.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Kaydedilemedi. Tekrar dene.'
  }
}

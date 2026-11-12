import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'

/** Another definition of the same deck, or another True Word, has this name (spec: "Names are unique"). */
export class NameTakenError extends Error {
  override readonly name = 'NameTakenError'

  constructor() {
    super('A definition with this name exists')
  }
}

/**
 * The definition changed on another device after the form opened (spec: "A changed definition is not overwritten
 * unseen"). Nothing was saved; the form shows the new values.
 */
export class DefinitionChangedError extends Error {
  override readonly name = 'DefinitionChangedError'

  constructor() {
    super('The definition changed meanwhile')
  }
}

/** The step needs a complete definition: publishing, adding as active, or editing an active or retired one. */
export class IncompleteDefinitionError extends Error {
  override readonly name = 'IncompleteDefinitionError'

  constructor() {
    super('The definition is incomplete')
  }
}

/** The chosen file is not a PNG, JPEG or WebP picture (spec: definition-editing, "Preparing a picture"). */
export class PictureTypeError extends Error {
  override readonly name = 'PictureTypeError'

  constructor() {
    super('Not a PNG, JPEG or WebP picture')
  }
}

/** The chosen file is over 20 MB, or the prepared WebP over the 1 MB that `storage.rules` accept. */
export class PictureTooLargeError extends Error {
  override readonly name = 'PictureTooLargeError'

  readonly limit: 'file' | 'picture'

  constructor(limit: 'file' | 'picture') {
    super(limit === 'file' ? 'The file is too large' : 'The prepared picture is too large')
    this.limit = limit
  }
}

/** The browser cannot prepare a picture: it has no `OffscreenCanvas`, or cannot encode WebP (Safari). */
export class PictureUnsupportedError extends Error {
  override readonly name = 'PictureUnsupportedError'

  constructor() {
    super('This browser cannot prepare a WebP picture')
  }
}

/** The file says it is a picture, but the browser cannot decode it. */
export class PictureUnreadableError extends Error {
  override readonly name = 'PictureUnreadableError'

  constructor() {
    super('The picture cannot be read')
  }
}

/** The Turkish message for a picture the form could not prepare; `null` for any other error. */
export function pictureErrorMessage(error: unknown): string | null {
  if (error instanceof PictureTypeError) {
    return 'Yalnızca PNG, JPEG ya da WebP bir resim kullanılabilir.'
  }
  if (error instanceof PictureTooLargeError) {
    return error.limit === 'file'
      ? 'Resim dosyası en fazla 20 MB olabilir.'
      : 'Hazırlanan resim 1 MB’tan büyük çıktı. Daha sade bir resim seç.'
  }
  if (error instanceof PictureUnsupportedError) {
    return 'Bu tarayıcı resmi hazırlayamıyor. Resim yüklemek için Chrome kullan.'
  }
  if (error instanceof PictureUnreadableError) {
    return 'Bu resim okunamadı. Başka bir dosya dene.'
  }
  return null
}

/** Why a definition step failed, as the interface explains it. Nothing was saved. */
export type DefinitionFailure =
  | { kind: 'name-taken' }
  | { kind: 'changed' }
  | { kind: 'incomplete' }
  /** A pack is open: status steps wait for it. */
  | { kind: 'table-busy' }
  /** No connection: definition steps are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a definition step can throw to a failure the interface explains. */
export function toDefinitionFailure(error: unknown): DefinitionFailure {
  if (error instanceof NameTakenError) return { kind: 'name-taken' }
  if (error instanceof DefinitionChangedError) return { kind: 'changed' }
  if (error instanceof IncompleteDefinitionError) return { kind: 'incomplete' }
  if (error instanceof TableBusyError) return { kind: 'table-busy' }
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

/** The Turkish message for a failure. `what` names the definition: "kart" or "True Word". */
export function definitionFailureMessage(failure: DefinitionFailure, what: string): string {
  switch (failure.kind) {
    case 'name-taken':
      return `Bu adla bir ${what} zaten var.`
    case 'changed':
      return `Bu ${what} bu arada başka bir yerde değişti. Yeni hâli gösteriliyor; değişikliğini yeniden yap.`
    case 'incomplete':
      return `Yayındaki bir ${what} için zorunlu alanların hepsi dolu olmalı.`
    case 'table-busy':
      return `${TABLE_BUSY_MESSAGE} Yayınlama, kaldırma, geri alma ve silme de bekler.`
    case 'offline':
      return 'Bağlantı yok: değişiklikleri kaydetmek için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Kaydedilemedi. Tekrar dene.'
  }
}

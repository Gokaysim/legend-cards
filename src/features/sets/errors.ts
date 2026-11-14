import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'

/** A set with this code already exists (spec: card-sets, "Distinct codes, names and aliases"). */
export class SetTakenError extends Error {
  override readonly name = 'SetTakenError'

  constructor() {
    super('A set with this code exists')
  }
}

/** The set changed on another device after the form or the row was shown (spec: "A changed set is not overwritten"). */
export class SetChangedError extends Error {
  override readonly name = 'SetChangedError'

  constructor() {
    super('The set changed meanwhile')
  }
}

/** Cards still have the set, so it cannot be deleted (spec: card-sets, "Deleting a set"). */
export class SetInUseError extends Error {
  override readonly name = 'SetInUseError'

  constructor() {
    super('Cards use this set')
  }
}

/** Why a set step failed, as the interface explains it. Nothing was saved. */
export type SetFailure =
  | { kind: 'taken' }
  | { kind: 'changed' }
  | { kind: 'in-use' }
  /** A pack is open: a layout change and a delete wait for it. */
  | { kind: 'table-busy' }
  /** No connection: set steps are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a set step can throw to a failure the interface explains. */
export function toSetFailure(error: unknown): SetFailure {
  if (error instanceof SetTakenError) return { kind: 'taken' }
  if (error instanceof SetChangedError) return { kind: 'changed' }
  if (error instanceof SetInUseError) return { kind: 'in-use' }
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

/** A Turkish message saying a connection is needed (spec: card-sets, "Set steps need a connection"). */
export const SET_OFFLINE_MESSAGE =
  'Bağlantı yok: setleri değiştirmek için internet bağlantısı gerekiyor.'

/** The Turkish message for a failure. */
export function setFailureMessage(failure: SetFailure): string {
  switch (failure.kind) {
    case 'taken':
      return 'Bu kodla bir set zaten var.'
    case 'changed':
      return 'Bu set bu arada başka bir yerde değişti. Yeni hâli gösteriliyor; değişikliğini yeniden yap.'
    case 'in-use':
      return 'Bu seti kullanan kartlar var: önce kartların setini değiştir.'
    case 'table-busy':
      return `${TABLE_BUSY_MESSAGE} Paket düzeni değişikliği ve silme de bekler.`
    case 'offline':
      return SET_OFFLINE_MESSAGE
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Kaydedilemedi. Tekrar dene.'
  }
}

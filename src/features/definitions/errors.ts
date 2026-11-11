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
      return { kind: 'permission-denied' }
    case 'unavailable':
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

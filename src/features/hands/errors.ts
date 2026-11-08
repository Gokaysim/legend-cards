import { firebaseCode } from '@/lib/firestore/errors'

/** A card movement that the current data does not allow, found inside a transaction before anything is written. */
export type HoldingErrorKind = 'taken' | 'closed' | 'card-missing'

export class HoldingError extends Error {
  override readonly name = 'HoldingError'
  readonly kind: HoldingErrorKind
  /** For `taken`: who holds the card now. */
  readonly holderUid: string | null

  constructor(kind: HoldingErrorKind, holderUid: string | null = null) {
    super(`Card movement failed: ${kind}`)
    this.kind = kind
    this.holderUid = holderUid
  }
}

/** Why a card movement or a holding update failed, as the interface explains it. */
export type HoldingFailure =
  /** A normal card was given to someone else between showing it and confirming. */
  | { kind: 'taken'; holderUid: string | null }
  /** The holding was closed meanwhile, for example used on another device. */
  | { kind: 'closed' }
  | { kind: 'card-missing' }
  /** No connection: card movements are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a card movement or a holding update can throw to a failure the interface explains. */
export function toHoldingFailure(error: unknown): HoldingFailure {
  if (error instanceof HoldingError) {
    return error.kind === 'taken'
      ? { kind: 'taken', holderUid: error.holderUid }
      : { kind: error.kind }
  }
  switch (firebaseCode(error)) {
    case 'permission-denied':
      return { kind: 'permission-denied' }
    case 'unavailable':
      return { kind: 'offline' }
    default:
      return { kind: 'unknown' }
  }
}

/** The Turkish message for a failure. `takenBy` is the possessive of the current holder's name, if known. */
export function holdingFailureMessage(failure: HoldingFailure, takenBy?: string): string {
  switch (failure.kind) {
    case 'taken':
      return takenBy
        ? `Bu kart az önce verildi: şimdi ${takenBy} elinde.`
        : 'Bu kart az önce başka birine verildi.'
    case 'closed':
      return 'Bu kart artık bu elde değil: başka bir cihazda kullanılmış ya da verilmiş olabilir.'
    case 'card-missing':
      return 'Kart bulunamadı.'
    case 'offline':
      return 'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'İşlem tamamlanamadı. Tekrar dene.'
  }
}

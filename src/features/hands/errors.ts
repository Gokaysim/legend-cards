import { formatAmount } from '@/features/balances/format'
import { CharacterUnavailableError } from '@/features/characters/errors'
import { shortfallNote } from '@/features/balances/paymentPlan'
import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'

/** A card movement that the current data does not allow, found inside a transaction before anything is written. */
export type HoldingErrorKind =
  | 'taken'
  | 'closed'
  | 'card-missing'
  | 'insufficient'
  | 'price-changed'
  | 'invalid-amount'
  | 'not-a-player'
  | 'character-unavailable'

/** What a use could not pay, for `insufficient`: the holder's LP and the amount. */
export type UseShortfall = { balance: number; amount: number }

export class HoldingError extends Error {
  override readonly name = 'HoldingError'
  readonly kind: HoldingErrorKind
  /** For `taken`: who holds the card now. */
  readonly holderUid: string | null
  /** For `insufficient`: the LP and the amount. */
  readonly shortfall: UseShortfall | null
  /** For `price-changed`: the price now. */
  readonly price: number | null

  constructor(
    kind: HoldingErrorKind,
    details: { holderUid?: string; shortfall?: UseShortfall; price?: number } = {},
  ) {
    super(`Card movement failed: ${kind}`)
    this.kind = kind
    this.holderUid = details.holderUid ?? null
    this.shortfall = details.shortfall ?? null
    this.price = details.price ?? null
  }
}

/** Why a card movement or a holding update failed, as the interface explains it. */
export type HoldingFailure =
  /** A normal card was given to someone else between showing it and confirming. */
  | { kind: 'taken'; holderUid: string | null }
  /** The holding was closed meanwhile, for example used on another device. */
  | { kind: 'closed' }
  | { kind: 'card-missing' }
  /** The holder's LP is below the amount of a use: changed on another device, for example. */
  | ({ kind: 'insufficient' } & UseShortfall)
  /** The card's fixed price changed between showing it and confirming: confirm again at the new price. */
  | { kind: 'price-changed'; price: number }
  /** An amount the price does not allow, or not a whole number from 0 to 1,000,000. */
  | { kind: 'invalid-amount' }
  /** A paid use of a card in the DM's own hand: the DM has no LP. */
  | { kind: 'not-a-player' }
  /** The chosen character was archived meanwhile, or does not exist (spec: card-holdings). */
  | { kind: 'character-unavailable' }
  /** A pack is open: the table waits for it, and no card moves until it ends. */
  | { kind: 'table-busy' }
  /** No connection: card movements are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a card movement or a holding update can throw to a failure the interface explains. */
export function toHoldingFailure(error: unknown): HoldingFailure {
  if (error instanceof HoldingError) {
    switch (error.kind) {
      case 'taken':
        return { kind: 'taken', holderUid: error.holderUid }
      case 'insufficient':
        return error.shortfall === null
          ? { kind: 'unknown' }
          : { kind: 'insufficient', ...error.shortfall }
      case 'price-changed':
        return error.price === null
          ? { kind: 'unknown' }
          : { kind: 'price-changed', price: error.price }
      default:
        return { kind: error.kind }
    }
  }
  if (error instanceof CharacterUnavailableError) return { kind: 'character-unavailable' }
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

/**
 * The Turkish message for a failure. `takenBy` is the possessive of the current holder's name, if known, and
 * `holderName` the name of the player whose hand the card is in.
 */
export function holdingFailureMessage(
  failure: HoldingFailure,
  { takenBy, holderName }: { takenBy?: string; holderName?: string } = {},
): string {
  switch (failure.kind) {
    case 'taken':
      return takenBy
        ? `Bu kart az önce verildi: şimdi ${takenBy} elinde.`
        : 'Bu kart az önce başka birine verildi.'
    case 'closed':
      return 'Bu kart artık bu elde değil: başka bir cihazda kullanılmış ya da verilmiş olabilir.'
    case 'card-missing':
      return 'Kart bulunamadı.'
    case 'insufficient':
      return shortfallNote(holderName ?? null, failure.balance, failure.amount)
    case 'price-changed':
      return `Kartın bedeli değişti: şimdi ${formatAmount(failure.price)} LP. Yeni bedelle tekrar onayla.`
    case 'invalid-amount':
      return 'Bu tutar bu kartın bedeline uymuyor.'
    case 'not-a-player':
      return "Bu elin sahibinin LP'si yok: kartı ücretsiz kullan."
    case 'character-unavailable':
      return 'Bu karakter artık seçilemiyor. Başka bir karakter seç.'
    case 'table-busy':
      return TABLE_BUSY_MESSAGE
    case 'offline':
      return 'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'İşlem tamamlanamadı. Tekrar dene.'
  }
}

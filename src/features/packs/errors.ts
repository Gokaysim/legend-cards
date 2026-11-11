import { formatAmount } from '@/features/balances/format'
import { firebaseCode } from '@/lib/firestore/errors'
import { genitive } from '@/lib/turkish'

/** A currency a pack can be paid with. */
export type PackCurrency = 'lp' | 'gp'

/** A pack step that the current data does not allow, found before anything is written. */
export type PackErrorKind =
  | 'busy'
  | 'not-enough-cards'
  | 'insufficient'
  | 'not-a-player'
  | 'invalid-amount'
  | 'retries-exhausted'
  | 'closed'
  | 'not-all-turned'
  | 'invalid-choice'
  | 'unavailable'

export class PackError extends Error {
  override readonly name = 'PackError'
  readonly kind: PackErrorKind
  /** For `insufficient`: the balance at the time, the amount needed, and their currency. */
  readonly shortfall: { currency: PackCurrency; balance: number; amount: number } | null

  constructor(
    kind: PackErrorKind,
    shortfall: { currency: PackCurrency; balance: number; amount: number } | null = null,
  ) {
    super(`Pack step failed: ${kind}`)
    this.kind = kind
    this.shortfall = shortfall
  }
}

/** Why a pack step failed, as the interface explains it. Nothing was opened, chosen, charged or refunded. */
export type PackFailure =
  /** Another pack is open: the table waits for it. */
  | { kind: 'busy' }
  /** The pool no longer has enough cards for this pack. */
  | { kind: 'not-enough-cards' }
  /** The balance is less than the amount. */
  | { kind: 'insufficient'; currency: PackCurrency; balance: number; amount: number }
  /** LP charged to someone who is not a player: the DM has no LP. */
  | { kind: 'not-a-player' }
  /** The DM's amount is not a whole number from 0 to 1,000,000. */
  | { kind: 'invalid-amount' }
  /** Every pick lost a shown card to another hand meanwhile, five times in a row. */
  | { kind: 'retries-exhausted' }
  /** The pack is no longer open: it was chosen from or cancelled, maybe on another device. */
  | { kind: 'closed' }
  /** A card was chosen before every card was turned. */
  | { kind: 'not-all-turned' }
  /** The card cannot be chosen: it was not shown, or it is the mandatory Cursed card. */
  | { kind: 'invalid-choice' }
  /** The card was retired or taken meanwhile, or is no longer active. */
  | { kind: 'unavailable' }
  /** No connection: pack steps are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a pack step can throw to a failure the interface explains. */
export function toPackFailure(error: unknown): PackFailure {
  if (error instanceof PackError) {
    return error.kind === 'insufficient' && error.shortfall !== null
      ? { kind: 'insufficient', ...error.shortfall }
      : error.kind === 'insufficient'
        ? { kind: 'unknown' }
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

/** The names a message may need: the hand's owner, and the owner of the pack that is open now, if known. */
export type PackFailureNames = { owner: string; openPackOwner?: string | null }

/** The Turkish message for a failure. */
export function packFailureMessage(failure: PackFailure, names: PackFailureNames): string {
  switch (failure.kind) {
    case 'busy':
      return names.openPackOwner
        ? `Şu anda ${names.openPackOwner} bir Pack açıyor. Seçim yapılınca tekrar dene.`
        : 'Şu anda açık bir Pack var. Seçim yapılınca tekrar dene.'
    case 'not-enough-cards':
      return 'Havuzda bu Pack için yeterli kart kalmadı.'
    case 'insufficient':
      return failure.currency === 'lp'
        ? `Bu Pack için ${formatAmount(failure.amount)} LP gerekiyor; ${genitive(names.owner)} ${formatAmount(failure.balance)} LP'si var.`
        : `Bu Pack için ${formatAmount(failure.amount)} GP gerekiyor; grup kesesinde ${formatAmount(failure.balance)} GP var.`
    case 'not-a-player':
      return "Bu kişinin LP'si yok: Pack'i GP ile ya da ücretsiz aç."
    case 'invalid-amount':
      return 'Tutar 0 ile 1.000.000 arasında bir tam sayı olmalı.'
    case 'retries-exhausted':
      return 'Pack açılamadı: kartlar o sırada başka ellere geçti. Tekrar dene.'
    case 'closed':
      return 'Bu Pack artık açık değil.'
    case 'not-all-turned':
      return 'Önce bütün kartları çevir.'
    case 'invalid-choice':
      return 'Bu kart seçilemez.'
    case 'unavailable':
      return 'Bu kart artık seçilemiyor. Başka bir kart seç ya da DM iptal etsin.'
    case 'offline':
      return 'Bağlantı yok: Pack işlemleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Pack işlemi yapılamadı. Tekrar dene.'
  }
}

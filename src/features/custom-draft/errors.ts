import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'
import { genitive } from '@/lib/turkish'

/** A Custom Card draft step that the current data does not allow, found before anything is written. */
export type CustomDraftErrorKind =
  | 'no-effects'
  | 'insufficient'
  | 'no-profile'
  | 'invalid-amount'
  | 'draft-open'
  | 'closed'
  | 'invalid-choice'
  | 'incomplete-texts'

export class CustomDraftError extends Error {
  override readonly name = 'CustomDraftError'
  readonly kind: CustomDraftErrorKind
  /** For `insufficient`: the user's LP at the time and the amount needed. */
  readonly shortfall: { balance: number; amount: number } | null

  constructor(
    kind: CustomDraftErrorKind,
    shortfall: { balance: number; amount: number } | null = null,
  ) {
    super(`Custom Card draft step failed: ${kind}`)
    this.kind = kind
    this.shortfall = shortfall
  }
}

/** Why a Custom Card draft step failed, as the interface explains it. Nothing was started, picked or charged. */
export type CustomDraftFailure =
  /** No effect text is stored at the draft's cost. */
  | { kind: 'no-effects' }
  /** The user's LP is less than the amount. */
  | { kind: 'insufficient'; balance: number; amount: number }
  /** LP charged to someone without a profile. */
  | { kind: 'no-profile' }
  /** The DM's amount is not a whole number from 0 to 1,000,000. */
  | { kind: 'invalid-amount' }
  /** The user already has an open Custom Card draft. */
  | { kind: 'draft-open' }
  /** The draft is no longer open: it ended, maybe on another device. */
  | { kind: 'closed' }
  /** The effect is not one of the step's options. */
  | { kind: 'invalid-choice' }
  /** An effect of the finished card has no text at its resolved cost. */
  | { kind: 'incomplete-texts' }
  /** A pack is open: the table waits for it. */
  | { kind: 'table-busy' }
  /** No connection: draft steps are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a draft step can throw to a failure the interface explains. */
export function toCustomDraftFailure(error: unknown): CustomDraftFailure {
  if (error instanceof CustomDraftError) {
    if (error.kind !== 'insufficient') return { kind: error.kind }
    return error.shortfall === null
      ? { kind: 'unknown' }
      : { kind: 'insufficient', ...error.shortfall }
  }
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

/** The Turkish message of a failure. `name` is the name of the user the draft is for. */
export function customDraftFailureMessage(failure: CustomDraftFailure, name: string): string {
  switch (failure.kind) {
    case 'no-effects':
      return 'Custom efektler yüklenmemiş: bu maliyette efekt yok.'
    case 'insufficient':
      return `Bu draft ${formatAmount(failure.amount)} LP tutuyor; ${genitive(name)} ${formatAmount(failure.balance)} LP'si var.`
    case 'no-profile':
      return "Bu kişinin profili yok: draft'ı ücretsiz başlat."
    case 'invalid-amount':
      return 'Tutar 0 ile 1.000.000 arasında bir tam sayı olmalı.'
    case 'draft-open':
      return `${genitive(name)} açık bir Custom Card draft'ı var: önce onu bitir.`
    case 'closed':
      return 'Bu draft artık açık değil.'
    case 'invalid-choice':
      return 'Bu efekt bu adımın seçenekleri arasında yok.'
    case 'incomplete-texts':
      return "Custom efektler eksik: bazı efektlerin bu maliyette metni yok. DM draft'ı iptal edebilir."
    case 'table-busy':
      return TABLE_BUSY_MESSAGE
    case 'offline':
      return 'Bağlantı yok: Custom Card draft işlemleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Custom Card draft işlemi yapılamadı. Tekrar dene.'
  }
}

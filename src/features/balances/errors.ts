import { firebaseCode } from '@/lib/firestore/errors'
import { genitive } from '@/lib/turkish'

import { formatAmount } from './format'
import { BALANCE_LIMITS } from './schema'

/** A balance change that the current data or the input does not allow, found before anything is written. */
export type BalanceErrorKind = 'insufficient' | 'not-a-player' | 'invalid'

export class BalanceError extends Error {
  override readonly name = 'BalanceError'
  readonly kind: BalanceErrorKind
  /** For `insufficient`: the balance at the time of the change. */
  readonly balance: number | null

  constructor(kind: BalanceErrorKind, balance: number | null = null) {
    super(`Balance change failed: ${kind}`)
    this.kind = kind
    this.balance = balance
  }
}

/** Why a balance change failed, as the interface explains it. */
export type BalanceFailure =
  /** Subtracting more than the balance, which never goes below 0. */
  | { kind: 'insufficient'; balance: number }
  /** LP of someone who is not a player: the DM has no LP. */
  | { kind: 'not-a-player' }
  /** An amount that is not a whole number in range, or a blank reason. */
  | { kind: 'invalid' }
  /** No connection: balance changes are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a balance change can throw to a failure the interface explains. */
export function toBalanceFailure(error: unknown): BalanceFailure {
  if (error instanceof BalanceError) {
    return error.kind === 'insufficient'
      ? { kind: 'insufficient', balance: error.balance ?? 0 }
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

/** Whose balance a message is about: a player's LP (by name) or the party purse. */
export type BalanceOwner = { currency: 'lp'; name: string } | { currency: 'gp' }

/** The Turkish message for a failure. `amount` is the amount the DM tried to subtract or add. */
export function balanceFailureMessage(
  failure: BalanceFailure,
  owner: BalanceOwner,
  amount: number,
): string {
  switch (failure.kind) {
    case 'insufficient':
      return owner.currency === 'lp'
        ? `${genitive(owner.name)} ${formatAmount(failure.balance)} LP'si var; ${formatAmount(amount)} LP düşülemez.`
        : `Grup kesesinde ${formatAmount(failure.balance)} GP var; ${formatAmount(amount)} GP düşülemez.`
    case 'not-a-player':
      return "Bu kişinin LP'si yok."
    case 'invalid':
      return `Miktar 1 ile ${formatAmount(BALANCE_LIMITS.amount)} arasında bir tam sayı olmalı, neden de boş olmamalı.`
    case 'offline':
      return 'Bağlantı yok: LP ve GP değişiklikleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'İşlem tamamlanamadı. Tekrar dene.'
  }
}

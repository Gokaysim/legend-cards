import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'
import { genitive } from '@/lib/turkish'

/** A draw that the current data does not allow, found before anything is written. */
export type DrawErrorKind =
  'nothing-to-draw' | 'insufficient' | 'retries-exhausted' | 'session-ended' | 'mode-changed'

export class DrawError extends Error {
  override readonly name = 'DrawError'
  readonly kind: DrawErrorKind
  /** For `insufficient`: the player's LP at the time of the draw. */
  readonly lp: number | null

  constructor(kind: DrawErrorKind, lp: number | null = null) {
    super(`Draw failed: ${kind}`)
    this.kind = kind
    this.lp = lp
  }
}

/** Why a draw failed, as the interface explains it. Nothing was drawn or charged. */
export type DrawFailure =
  /** No card can be drawn: the pool, the DM's filters or the Cursed Deck give none. */
  | { kind: 'nothing-to-draw' }
  /** A player's draw costs 1 LP, and they have less. */
  | { kind: 'insufficient'; lp: number }
  /** Every picked card went to another hand meanwhile, five times in a row. */
  | { kind: 'retries-exhausted' }
  /** The draw's session was ended meanwhile, by the DM or by another tab: the next draw starts a new one. */
  | { kind: 'session-ended' }
  /** The DM changed the table's player draw mode, and it no longer allows the filters of a player's draw. */
  | { kind: 'mode-changed' }
  /** A pack is open: the table waits for it, and nobody draws until it ends. */
  | { kind: 'table-busy' }
  /** No connection: a draw is a transaction, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** The message of a player's draw that the DM's change of the player draw mode refused. */
export const MODE_CHANGED_MESSAGE = 'DM oyuncu kart çekişini değiştirdi; filtreler kaldırıldı.'

/** Maps anything a draw can throw to a failure the interface explains. */
export function toDrawFailure(error: unknown): DrawFailure {
  if (error instanceof DrawError) {
    return error.kind === 'insufficient'
      ? { kind: 'insufficient', lp: error.lp ?? 0 }
      : { kind: error.kind }
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

/** The Turkish message for a failure. `name` is the name of the player whose hand the draw was for. */
export function drawFailureMessage(failure: DrawFailure, name: string): string {
  switch (failure.kind) {
    case 'nothing-to-draw':
      return 'Çekilebilecek kart yok.'
    case 'insufficient':
      return `Kart çekmek için 1 LP gerekiyor; ${genitive(name)} ${formatAmount(failure.lp)} LP'si var.`
    case 'retries-exhausted':
      return 'Kart çekilemedi: kartlar o sırada başka ellere geçti. Tekrar dene.'
    case 'session-ended':
      return 'Bu çekiş bitirildi. Tekrar çekersen yeni bir çekiş başlar.'
    case 'mode-changed':
      return MODE_CHANGED_MESSAGE
    case 'table-busy':
      return TABLE_BUSY_MESSAGE
    case 'offline':
      return 'Bağlantı yok: kart çekmek için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'Kart çekilemedi. Tekrar dene.'
  }
}

import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_MESSAGE, TableBusyError } from '@/features/table/errors'
import { firebaseCode } from '@/lib/firestore/errors'
import { genitive } from '@/lib/turkish'
import { CharacterUnavailableError } from '@/features/characters/errors'

/** A True Word step that the current data does not allow, found before anything is written. */
export type WordErrorKind =
  | 'too-few-words'
  | 'insufficient'
  | 'not-a-player'
  | 'invalid-amount'
  | 'draft-open'
  | 'retries-exhausted'
  | 'closed'
  | 'invalid-choice'
  | 'word-known'
  | 'unavailable'
  | 'not-known'
  | 'price-changed'

export class WordError extends Error {
  override readonly name = 'WordError'
  readonly kind: WordErrorKind
  /** For `insufficient`: the player's LP at the time and the amount needed. */
  readonly shortfall: { balance: number; amount: number } | null
  /** For `price-changed`: the word's price now. */
  readonly price: number | null

  constructor(
    kind: WordErrorKind,
    shortfall: { balance: number; amount: number } | null = null,
    price: number | null = null,
  ) {
    super(`True Word step failed: ${kind}`)
    this.kind = kind
    this.shortfall = shortfall
    this.price = price
  }
}

/** Why a True Word step failed, as the interface explains it. Nothing was started, learned, charged or refunded. */
export type WordFailure =
  /** Fewer than 3 active words remain that the player does not know. */
  | { kind: 'too-few-words' }
  /** The player's LP is less than the amount. */
  | { kind: 'insufficient'; balance: number; amount: number }
  /** LP charged to someone who is not a player: the DM has no LP. */
  | { kind: 'not-a-player' }
  /** The DM's amount is not a whole number from 0 to 1,000,000. */
  | { kind: 'invalid-amount' }
  /** The player already has an open draft. */
  | { kind: 'draft-open' }
  /** Every pick showed a word the player came to know meanwhile, five times in a row. */
  | { kind: 'retries-exhausted' }
  /** The draft is no longer open: it ended, maybe on another device. */
  | { kind: 'closed' }
  /** The word is not one of the draft's words. */
  | { kind: 'invalid-choice' }
  /** The player already knows the word. */
  | { kind: 'word-known' }
  /** The word is not active (a draft, or retired), or does not exist. */
  | { kind: 'unavailable' }
  /** The player does not know the word any more: it was taken back meanwhile. */
  | { kind: 'not-known' }
  /** The word's fixed price changed between showing it and confirming a use: confirm again at the new price. */
  | { kind: 'price-changed'; price: number }
  /** A pack is open: the table waits for it, True Words included. */
  /** The character chosen for a use was archived meanwhile, or does not exist. */
  | { kind: 'character-unavailable' }
  | { kind: 'table-busy' }
  /** No connection: True Word steps are transactions, and transactions need the server. */
  | { kind: 'offline' }
  | { kind: 'permission-denied' }
  | { kind: 'unknown' }

/** Maps anything a True Word step can throw to a failure the interface explains. */
export function toWordFailure(error: unknown): WordFailure {
  if (error instanceof WordError) {
    if (error.kind === 'price-changed') {
      return error.price === null
        ? { kind: 'unknown' }
        : { kind: 'price-changed', price: error.price }
    }
    if (error.kind !== 'insufficient') return { kind: error.kind }
    return error.shortfall === null
      ? { kind: 'unknown' }
      : { kind: 'insufficient', ...error.shortfall }
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

/** The Turkish message for a failure. `name` is the name of the player whose True Words the step was for. */
export function wordFailureMessage(failure: WordFailure, name: string): string {
  switch (failure.kind) {
    case 'too-few-words':
      return 'Draft için en az 3 öğrenilmemiş True Word gerekli.'
    case 'insufficient':
      return `Bu draft ${formatAmount(failure.amount)} LP tutuyor; ${genitive(name)} ${formatAmount(failure.balance)} LP'si var.`
    case 'not-a-player':
      return "Bu kişinin LP'si yok: draft'ı ücretsiz başlat."
    case 'invalid-amount':
      return 'Tutar 0 ile 1.000.000 arasında bir tam sayı olmalı.'
    case 'draft-open':
      return `${genitive(name)} açık bir draft'ı var: önce onu bitir.`
    case 'retries-exhausted':
      return 'Draft başlatılamadı: kelimeler o sırada öğrenildi. Tekrar dene.'
    case 'closed':
      return 'Bu draft artık açık değil.'
    case 'invalid-choice':
      return "Bu True Word bu draft'ta yok."
    case 'word-known':
      return `${name} bu True Word'ü zaten biliyor.`
    case 'unavailable':
      return 'Bu True Word artık kullanılmıyor.'
    case 'not-known':
      return `${name} bu True Word'ü artık bilmiyor.`
    case 'price-changed':
      return `Bu True Word'ün bedeli değişti: şimdi ${formatAmount(failure.price)} LP. Yeni bedelle tekrar onayla.`
    case 'character-unavailable':
      return 'Bu karakter artık seçilemiyor. Başka bir karakter seç.'
    case 'table-busy':
      return TABLE_BUSY_MESSAGE
    case 'offline':
      return 'Bağlantı yok: True Word işlemleri için internet bağlantısı gerekiyor.'
    case 'permission-denied':
      return 'Bu işlem için yetkin yok.'
    case 'unknown':
      return 'True Word işlemi yapılamadı. Tekrar dene.'
  }
}

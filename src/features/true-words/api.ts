import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  getDocFromServer,
  query,
  type Query,
  runTransaction,
  serverTimestamp,
  type Transaction,
  where,
  type WithFieldValue,
} from 'firebase/firestore'

import { LEDGER_COLLECTION, newLedgerEntry, readBalance, setBalance } from '@/features/balances/api'
import { BalanceError } from '@/features/balances/errors'
import { cardRef } from '@/features/cards/api'
import { inWordDraft } from '@/features/cards/pool'
import { isTrueWord, type TrueWord } from '@/features/cards/schema'
import type { UseTarget } from '@/features/characters/useTarget'
import { DRAWS_COLLECTION } from '@/features/draws/api'
import {
  closeHolding,
  HOLDINGS_COLLECTION,
  holdingRef,
  openHolding,
  setHoldingActive,
} from '@/features/hands/api'
import { HoldingError } from '@/features/hands/errors'
import { explainDenial, openPackIdOnServer, tableRef } from '@/features/table/api'
import { TableBusyError } from '@/features/table/errors'
import { openPackIdOf } from '@/features/table/schema'
import { firebaseCode } from '@/lib/firestore/errors'
import { cryptoRandom, type RandomSource, sample } from '@/lib/random'

import { WordError } from './errors'
import {
  DRAFT_COST_MAX,
  draftPrice,
  EMPTY_PLAYER_WORDS,
  type PlayerWords,
  playerWordsConverter,
  type StoredWordDraft,
  WORD_DRAFT_SIZE,
  type WordDraft,
  wordDraftConverter,
} from './schema'

/**
 * Collections. Since unify-cards-and-true-words, a word is a definition in `cards`, a learned word a holding in
 * `userCards`, a draft a `draws` record of the kind `wordDraft`, and a use a `uses` record. Keep in step with
 * `firestore.rules`.
 */
export const PLAYER_WORDS_COLLECTION = 'playerWords'

export function playerWordsRef(db: Firestore, uid: string): DocumentReference<PlayerWords> {
  return doc(db, PLAYER_WORDS_COLLECTION, uid).withConverter(playerWordsConverter)
}

/** The True Word drafts among the draws, validated as drafts. Query them by kind; never read the whole collection. */
function wordDraftsRef(db: Firestore): CollectionReference<WordDraft> {
  return collection(db, DRAWS_COLLECTION).withConverter(wordDraftConverter)
}

export function wordDraftRef(db: Firestore, draftId: string): DocumentReference<WordDraft> {
  return doc(wordDraftsRef(db), draftId)
}

/** Every open draft, at most one per player. Two equality filters, so no composite index is needed. */
export function openDraftsQuery(db: Firestore): Query<WordDraft> {
  return query(wordDraftsRef(db), where('kind', '==', 'wordDraft'), where('status', '==', 'open'))
}

/** Plain refs for writes: the converted refs' types would ask for the `id` field, which is never stored. */
const writableDraft = (db: Firestore, draftId: string) => doc(db, DRAWS_COLLECTION, draftId)
const writableHolding = (db: Firestore, holdingId: string) =>
  doc(db, HOLDINGS_COLLECTION, holdingId)
const writableState = (db: Firestore, uid: string) => doc(db, PLAYER_WORDS_COLLECTION, uid)

/** Throws `TableBusyError` when a pack is open: the table waits for it, True Words included. */
async function ensureTableFree(transaction: Transaction, db: Firestore): Promise<void> {
  const openPackId = openPackIdOf((await transaction.get(tableRef(db))).data())
  if (openPackId !== null) throw new TableBusyError(openPackId)
}

async function readState(transaction: Transaction, db: Firestore, uid: string) {
  return (await transaction.get(playerWordsRef(db, uid))).data() ?? EMPTY_PLAYER_WORDS
}

/** Reads a user's LP inside the transaction, a DM's included; a missing profile is `no-profile`. */
async function readLp(transaction: Transaction, db: Firestore, uid: string): Promise<number> {
  try {
    return await readBalance(transaction, db, { currency: 'lp', uid })
  } catch (error) {
    if (error instanceof BalanceError && error.kind === 'no-profile') {
      throw new WordError('no-profile')
    }
    throw error
  }
}

/** A word that is active, so a draft can show it and the DM can teach it. */
async function readActiveWord(
  transaction: Transaction,
  db: Firestore,
  wordId: string,
): Promise<TrueWord> {
  const word = (await transaction.get(cardRef(db, wordId))).data()
  if (!word || !isTrueWord(word) || word.status !== 'active') throw new WordError('unavailable')
  return word
}

/**
 * The holding of a word learned now (design D5 of unify-cards-and-true-words): from a draft, naming it, or taught by the
 * DM. It starts active exactly when the word's "Elde etkili" is on.
 */
function newWordHolding(
  word: TrueWord,
  uid: string,
  by: string,
  draftId: string | null,
): ReturnType<typeof openHolding> {
  return openHolding({
    cardId: word.id,
    cardName: word.name,
    cardKind: 'trueWord',
    uid,
    givenBy: by,
    givenVia: draftId === null ? 'dm' : 'draft',
    drawId: draftId,
    active: word.hasHeldEffect,
  })
}

/**
 * After a denied commit: a pack that is open now is `TableBusyError`, a draft that ended meanwhile is `closed`, and
 * anything else is the denial itself. Callers throw the result.
 */
async function explainDraftDenial(db: Firestore, draftId: string, error: unknown) {
  const explained = await explainDenial(db, error)
  if (explained !== error || firebaseCode(error) !== 'permission-denied') return explained
  try {
    const draft = (await getDocFromServer(wordDraftRef(db, draftId))).data()
    return draft?.status === 'open' ? error : new WordError('closed')
  } catch {
    return error
  }
}

export type StartDraftInput = {
  /** The player the draft is for. */
  uid: string
  /** The signed-in user: the player, or the DM. */
  by: string
  /** `'price'` charges 1 LP plus the words the player knows. The DM may give any amount; 0 is free. */
  amount: number | 'price'
  /** The live words: the draft shows active ones that the player does not know. */
  words: readonly TrueWord[]
  /** The words the player knows, as the client sees them. The transaction checks them again. */
  known: ReadonlySet<string>
  /** Defaults to the browser's cryptographic random numbers. */
  random?: RandomSource
}

/** At most this many tries: a picked word that the player came to know meanwhile is replaced. */
const MAX_ATTEMPTS = 5

/** A picked word is known by the player now. Only used inside `startDraft`. */
class KnownWordError extends Error {
  override readonly name = 'KnownWordError'
  readonly wordId: string

  constructor(wordId: string) {
    super(`Word ${wordId} is known already`)
    this.wordId = wordId
  }
}

/**
 * The words a draft for a player who knows `known` can show: active, with "Draft'ta çıkar" on, and not known (spec:
 * true-words, "Starting a draft").
 */
export function learnableWords(words: readonly TrueWord[], known: ReadonlySet<string>): TrueWord[] {
  return words.filter((word) => inWordDraft(word, known))
}

/**
 * The words the DM can teach a player who knows `known`: active and not known, whatever their flags (spec:
 * true-words, "The DM teaches a word"). A word kept out of drafts ("DM'e özel") is among them.
 */
export function teachableWords(words: readonly TrueWord[], known: ReadonlySet<string>): TrueWord[] {
  return words.filter((word) => word.status === 'active' && !known.has(word.id))
}

/**
 * Starts a True Word draft, in one transaction that writes the open draft, points the player's state at it, and,
 * when paid, writes the ledger entry and the new LP, as the rules require. Returns the draft's ID.
 *
 * The 3 words are picked outside the transaction. A picked word that the player came to know meanwhile is replaced
 * by another pick, so the player is charged once.
 *
 * Throws `WordError` (`too-few-words`, `insufficient`, `no-profile`, `invalid-amount`, `draft-open`,
 * `retries-exhausted`) and `TableBusyError`.
 */
export async function startDraft(db: Firestore, input: StartDraftInput): Promise<string> {
  const { amount } = input
  if (amount !== 'price' && (!Number.isInteger(amount) || amount < 0 || amount > DRAFT_COST_MAX)) {
    throw new WordError('invalid-amount')
  }
  const excluded = new Set(input.known)
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidates = learnableWords(input.words, excluded)
    if (candidates.length < WORD_DRAFT_SIZE) throw new WordError('too-few-words')
    const offered = sample(candidates, WORD_DRAFT_SIZE, input.random ?? cryptoRandom).map(
      (word) => word.id,
    )
    try {
      return await startOnce(db, input, offered)
    } catch (error) {
      if (error instanceof KnownWordError) {
        excluded.add(error.wordId)
        continue
      }
      if (firebaseCode(error) !== 'permission-denied') throw error
      const openPackId = await openPackIdOnServer(db).catch(() => null)
      if (openPackId !== null) throw new TableBusyError(openPackId)
      const state = (await getDocFromServer(playerWordsRef(db, input.uid))).data()
      if (state?.openDraftId) throw new WordError('draft-open')
      const knownNow = offered.find((wordId) => state?.known[wordId] !== undefined)
      if (knownNow === undefined) throw error
      excluded.add(knownNow)
    }
  }
  throw new WordError('retries-exhausted')
}

function startOnce(db: Firestore, input: StartDraftInput, offered: string[]): Promise<string> {
  const draftDoc = doc(collection(db, DRAWS_COLLECTION))
  const entryDoc = doc(collection(db, LEDGER_COLLECTION))
  return runTransaction(db, async (transaction) => {
    await ensureTableFree(transaction, db)
    const state = await readState(transaction, db, input.uid)
    if (state.openDraftId !== null) throw new WordError('draft-open')
    const knownNow = offered.find((wordId) => state.known[wordId] !== undefined)
    if (knownNow !== undefined) throw new KnownWordError(knownNow)
    const cost =
      input.amount === 'price' ? draftPrice(Object.keys(state.known).length) : input.amount
    let balanceAfter: number | null = null
    if (cost > 0) {
      const balance = await readLp(transaction, db, input.uid)
      if (balance < cost) throw new WordError('insufficient', { balance, amount: cost })
      balanceAfter = balance - cost
    }

    const draft: WithFieldValue<StoredWordDraft> = {
      kind: 'wordDraft',
      uid: input.uid,
      by: input.by,
      at: serverTimestamp(),
      offered,
      status: 'open',
      paidWith: cost > 0 ? 'lp' : 'none',
      cost,
      entryId: cost > 0 ? entryDoc.id : null,
      closedAt: null,
      closedBy: null,
      learned: null,
      refundEntryId: null,
    }
    transaction.set(draftDoc, draft)
    transaction.set(writableState(db, input.uid), { ...state, openDraftId: draftDoc.id })
    if (balanceAfter !== null) {
      transaction.set(
        entryDoc,
        newLedgerEntry({
          currency: 'lp',
          account: input.uid,
          delta: -cost,
          balanceAfter,
          source: 'wordDraft',
          drawId: draftDoc.id,
          by: input.by,
        }),
      )
      setBalance(transaction, db, { currency: 'lp', uid: input.uid }, balanceAfter, entryDoc.id)
    }
    return draftDoc.id
  })
}

/** Reads the draft inside the transaction; one that is missing or no longer open is `closed`. */
async function readOpenDraft(
  transaction: Transaction,
  db: Firestore,
  draftId: string,
): Promise<WordDraft> {
  const draft = (await transaction.get(wordDraftRef(db, draftId))).data()
  if (!draft || draft.status !== 'open') throw new WordError('closed')
  return draft
}

export type DraftStepInput = {
  draftId: string
  /** The signed-in user: the draft's player, or the DM (who alone cancels). */
  by: string
}

export type LearnWordInput = DraftStepInput & { wordId: string }

/**
 * Learns one of an open draft's words and ends the draft, in one transaction: the word joins the player's True
 * Words with a new holding, active when its "Elde etkili" is on, and the draft is marked learned. Returns the
 * holding's ID.
 *
 * Throws `WordError` (`closed`, `invalid-choice`, `unavailable`, `word-known`) and `TableBusyError`.
 */
export async function learnWord(db: Firestore, input: LearnWordInput): Promise<string> {
  try {
    return await learnOnce(db, input)
  } catch (error) {
    throw await explainDraftDenial(db, input.draftId, error)
  }
}

function learnOnce(db: Firestore, { draftId, wordId, by }: LearnWordInput): Promise<string> {
  const holdingDoc = doc(collection(db, HOLDINGS_COLLECTION))
  return runTransaction(db, async (transaction) => {
    await ensureTableFree(transaction, db)
    const draft = await readOpenDraft(transaction, db, draftId)
    if (!draft.offered.includes(wordId)) throw new WordError('invalid-choice')
    const word = await readActiveWord(transaction, db, wordId)
    const state = await readState(transaction, db, draft.uid)
    if (state.known[wordId] !== undefined) throw new WordError('word-known')

    transaction.set(holdingDoc, newWordHolding(word, draft.uid, by, draftId))
    transaction.set(writableState(db, draft.uid), {
      known: { ...state.known, [wordId]: holdingDoc.id },
      openDraftId: null,
      holdingId: holdingDoc.id,
    })
    transaction.update(writableDraft(db, draftId), {
      status: 'learned',
      closedAt: serverTimestamp(),
      closedBy: by,
      learned: { cardId: wordId, cardName: word.name, holdingId: holdingDoc.id },
    })
    return holdingDoc.id
  })
}

/**
 * Skips an open draft ("Pas Geç"): it ends without a word, and its payment is not refunded.
 * Throws `WordError('closed')` and `TableBusyError`.
 */
export async function skipDraft(db: Firestore, input: DraftStepInput): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const draft = await readOpenDraft(transaction, db, input.draftId)
      const state = await readState(transaction, db, draft.uid)
      transaction.update(writableDraft(db, input.draftId), {
        status: 'skipped',
        closedAt: serverTimestamp(),
        closedBy: input.by,
      })
      transaction.set(writableState(db, draft.uid), { ...state, openDraftId: null })
    })
  } catch (error) {
    throw await explainDraftDenial(db, input.draftId, error)
  }
}

/**
 * Cancels an open draft (the DM only), in one transaction: it ends without a word, and a paid draft's cost goes
 * back to the player's LP with a refund entry. Throws `WordError('closed')` and `TableBusyError`.
 */
export async function cancelDraft(db: Firestore, input: DraftStepInput): Promise<void> {
  const refundDoc = doc(collection(db, LEDGER_COLLECTION))
  try {
    await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const draft = await readOpenDraft(transaction, db, input.draftId)
      const state = await readState(transaction, db, draft.uid)
      const paid = draft.paidWith === 'lp'
      const balance = paid ? await readLp(transaction, db, draft.uid) : null

      transaction.update(writableDraft(db, input.draftId), {
        status: 'cancelled',
        closedAt: serverTimestamp(),
        closedBy: input.by,
        refundEntryId: paid ? refundDoc.id : null,
      })
      transaction.set(writableState(db, draft.uid), { ...state, openDraftId: null })
      if (balance !== null) {
        const after = balance + draft.cost
        transaction.set(
          refundDoc,
          newLedgerEntry({
            currency: 'lp',
            account: draft.uid,
            delta: draft.cost,
            balanceAfter: after,
            source: 'wordDraft',
            drawId: input.draftId,
            by: input.by,
          }),
        )
        setBalance(transaction, db, { currency: 'lp', uid: draft.uid }, after, refundDoc.id)
      }
    })
  } catch (error) {
    throw await explainDraftDenial(db, input.draftId, error)
  }
}

export type TeachWordInput = {
  /** The player who learns the word. */
  uid: string
  wordId: string
  /** The signed-in DM. */
  by: string
}

/**
 * Teaches a word directly (the DM only), whatever its flags, without a draft and without LP: a new holding, active when
 * its "Elde etkili" is on, and the word in the player's state. An open draft stays open. Returns the holding's ID.
 * Throws `WordError` (`unavailable`, `word-known`) and `TableBusyError`.
 */
export async function teachWord(db: Firestore, input: TeachWordInput): Promise<string> {
  const holdingDoc = doc(collection(db, HOLDINGS_COLLECTION))
  try {
    return await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const word = await readActiveWord(transaction, db, input.wordId)
      const state = await readState(transaction, db, input.uid)
      if (state.known[input.wordId] !== undefined) throw new WordError('word-known')

      transaction.set(holdingDoc, newWordHolding(word, input.uid, input.by, null))
      transaction.set(writableState(db, input.uid), {
        ...state,
        known: { ...state.known, [input.wordId]: holdingDoc.id },
        holdingId: holdingDoc.id,
      })
      return holdingDoc.id
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

export type TakeBackWordInput = {
  /** The player's open holding of the word. */
  recordId: string
  /** The signed-in DM. */
  by: string
}

/**
 * Takes back a word a player knows (the DM only), to correct a mistake: its holding closes for good as discarded, and
 * the word leaves the player's state, so it can be learned again with a new holding.
 * Throws `WordError('not-known')` and `TableBusyError`.
 */
export async function takeBackWord(db: Firestore, input: TakeBackWordInput): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const holding = (await transaction.get(holdingRef(db, input.recordId))).data()
      if (!holding || holding.returnedAt !== null || holding.cardKind !== 'trueWord') {
        throw new WordError('not-known')
      }
      const state = await readState(transaction, db, holding.uid)
      if (state.known[holding.cardId] !== input.recordId) throw new WordError('not-known')

      const known = { ...state.known }
      delete known[holding.cardId]
      transaction.update(writableHolding(db, input.recordId), {
        returnedAt: serverTimestamp(),
        returnedBy: input.by,
        returnReason: 'discarded',
        usedOn: null,
      })
      transaction.set(writableState(db, holding.uid), {
        ...state,
        known,
        holdingId: input.recordId,
      })
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

/** Switches a known word with a held effect active or inactive (the DM only). Allowed while a pack is open. */
export function setWordActive(db: Firestore, recordId: string, active: boolean): Promise<void> {
  return setHoldingActive(db, recordId, active)
}

export type RecordWordUseInput = {
  /** The player's open holding of the word. */
  recordId: string
  /** The signed-in user: the player, or the DM. */
  by: string
  /**
   * The LP the user confirmed, taken from the player's LP: the price of the word's cost in this hand for the player's
   * own use, any whole amount for the DM, 0 for free (spec: true-words, "Using a True Word").
   */
  amount: number
  /** On which character the word was used. None by default. */
  target?: UseTarget
  /** Adds the word's effect to the chosen character in the same step, when its "Kullanınca efekt bırakır" is on. */
  addEffect?: boolean
}

/** A holding step's refusal, as a True Word step names it. */
function asWordError(error: unknown): unknown {
  if (!(error instanceof HoldingError)) return error
  switch (error.kind) {
    case 'closed':
      return new WordError('not-known')
    case 'card-missing':
      return new WordError('unavailable')
    case 'insufficient':
      return new WordError('insufficient', error.shortfall)
    case 'price-changed':
      return new WordError('price-changed', null, error.price)
    case 'invalid-amount':
    case 'no-profile':
      return new WordError(error.kind)
    default:
      return error
  }
}

/**
 * Records one use of a word a player knows, with its payment (design D5 of unify-cards-and-true-words): a True Word is
 * kept on use, so the holding's use step records a `uses` record, and when it pays, the ledger entry and the player's
 * new LP. The word stays known.
 *
 * Throws `WordError`: `not-known` for a word taken back, `unavailable` for a missing word, `price-changed` with the
 * price now when the player's own use confirms another fixed price, `invalid-amount` for an amount the price does not
 * allow, `insufficient` when the LP is below the amount, and `no-profile` for a paid use of a word whose holder has no profile. Throws
 * `TableBusyError` while a pack is open.
 */
export async function recordWordUse(db: Firestore, input: RecordWordUseInput): Promise<void> {
  try {
    await closeHolding(db, {
      holdingId: input.recordId,
      by: input.by,
      reason: 'used',
      amount: input.amount,
      target: input.target,
      addEffect: input.addEffect,
    })
  } catch (error) {
    throw asWordError(error)
  }
}

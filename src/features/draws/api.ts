import {
  collection,
  type CollectionReference,
  doc,
  type Firestore,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type WithFieldValue,
} from 'firebase/firestore'

import { LEDGER_COLLECTION, newLedgerEntry } from '@/features/balances/api'
import { cardRef } from '@/features/cards/api'
import { type DrawFilters, inCursedDeck, inRandomDraw } from '@/features/cards/pool'
import { type Card, type Definition, isCard } from '@/features/cards/schema'
import { HOLDINGS_COLLECTION, openHolding } from '@/features/hands/api'
import { profileRef, USERS_COLLECTION } from '@/features/users/api'
import { explainDenial } from '@/features/table/api'
import { firebaseCode } from '@/lib/firestore/errors'

import { DrawError } from './errors'
import { pickRandom, type RandomSource } from '@/lib/random'
import { DRAW_PRICE, type Draw, drawConverter, type DrawKind, type StoredCardDraw } from './schema'

/** Keep in step with `firestore.rules`. */
export const DRAWS_COLLECTION = 'draws'

/** Every draw and pack opening, validated and with the document ID as `id`. */
export function drawsRef(db: Firestore): CollectionReference<Draw> {
  return collection(db, DRAWS_COLLECTION).withConverter(drawConverter)
}

export type DrawCardInput = {
  kind: DrawKind
  /** Whose hand the card goes to. */
  uid: string
  /** The signed-in user: the hand's owner, or the DM. */
  by: string
  /** A player's own random draw costs 1 LP. The DM's draws and Cursed draws are free. */
  paid: boolean
  /** The DM's filters, recorded with the draw; `null` without filters. */
  filters: DrawFilters | null
  /** The cards to pick from, from the live cards: the drawable cards that pass the filters, or the Cursed Deck. */
  candidates: readonly Card[]
  /** Defaults to the browser's cryptographic random numbers. */
  random?: RandomSource
}

export type DrawResult = {
  drawId: string
  holdingId: string
  /** The drawn card, as the transaction read it. */
  card: Card
}

/** At most this many tries: a taken card is replaced by another pick, and a moved LP balance is read again. */
const MAX_ATTEMPTS = 5

/** The picked card is no longer drawable: someone took it, or it was retired. Only used inside `drawCard`. */
class TakenError extends Error {
  override readonly name = 'TakenError'
}

/**
 * Draws one card into a hand, in one transaction that writes the draw, its holding (active when the card's "Elde
 * etkili" is on), the new holder of a card with one copy and, when paid, the ledger entry and the player's new LP, as
 * the rules require. Nothing is written or charged
 * unless the whole draw is saved.
 *
 * The card is picked from `candidates` with the same chance for each, outside the transaction, which re-reads
 * only that card. When the card is no longer drawable, another one is picked from the rest, so every remaining
 * card keeps the same chance and the player is charged once.
 *
 * When another device takes the card or changes the player's LP between the transaction's reads and its commit,
 * the rules deny the commit before the transaction could retry. So after a denial, the card and the LP are read
 * from the server: a taken card is replaced, a moved balance runs the same pick again, and anything else is a
 * real denial and is thrown.
 *
 * Throws `DrawError`: `nothing-to-draw` when no candidate is left, `insufficient` when a paid draw finds less
 * than 1 LP, and `retries-exhausted` after five tries. Throws `TableBusyError` when the rules denied the draw
 * because a pack is open.
 */
export async function drawCard(db: Firestore, input: DrawCardInput): Promise<DrawResult> {
  const tried = new Set<string>()
  let card: Card | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    card ??= pickRandom(
      input.candidates.filter((candidate) => !tried.has(candidate.id)),
      input.random,
    )
    if (card === null) throw new DrawError('nothing-to-draw')
    const read = { lp: null as number | null }
    try {
      return await drawOnce(db, input, card, read)
    } catch (error) {
      if (error instanceof TakenError) {
        tried.add(card.id)
        card = null
        continue
      }
      if (firebaseCode(error) !== 'permission-denied') throw error
      const explained = await explainDenial(db, error)
      if (explained !== error) throw explained
      if (await isTakenOnServer(db, card.id, input.kind)) {
        tried.add(card.id)
        card = null
        continue
      }
      if (read.lp === null || (await serverLp(db, input.uid)) === read.lp) throw error
    }
  }
  throw new DrawError('retries-exhausted')
}

/**
 * True for a definition a draw of `kind` cannot give now: missing, a True Word, or no longer in that draw (spec:
 * card-draws): not active, its draw flag turned off, or the one copy of a card that someone holds.
 */
function isTaken(definition: Definition | undefined, kind: DrawKind): definition is undefined {
  if (!definition || !isCard(definition)) return true
  return kind === 'random' ? !inRandomDraw(definition) : !inCursedDeck(definition)
}

async function isTakenOnServer(db: Firestore, cardId: string, kind: DrawKind): Promise<boolean> {
  return isTaken((await getDocFromServer(cardRef(db, cardId))).data(), kind)
}

async function serverLp(db: Firestore, uid: string): Promise<number | null> {
  return (await getDocFromServer(profileRef(db, uid))).data()?.lp ?? null
}

function drawOnce(
  db: Firestore,
  { kind, uid, by, paid, filters }: DrawCardInput,
  picked: Card,
  read: { lp: number | null },
): Promise<DrawResult> {
  const ref = cardRef(db, picked.id)
  const drawDoc = doc(collection(db, DRAWS_COLLECTION))
  const holdingDoc = doc(collection(db, HOLDINGS_COLLECTION))
  const entryDoc = doc(collection(db, LEDGER_COLLECTION))
  return runTransaction(db, async (transaction) => {
    const stored = (await transaction.get(ref)).data()
    if (isTaken(stored, kind) || !isCard(stored)) throw new TakenError()
    const card = stored
    let lpAfter: number | null = null
    if (paid) {
      const lp = (await transaction.get(profileRef(db, uid))).data()?.lp ?? 0
      read.lp = lp
      if (lp < DRAW_PRICE) throw new DrawError('insufficient', lp)
      lpAfter = lp - DRAW_PRICE
    }

    const draw: WithFieldValue<StoredCardDraw> = {
      kind,
      uid,
      by,
      at: serverTimestamp(),
      cardId: card.id,
      cardName: card.name,
      cardKind: card.kind,
      holdingId: holdingDoc.id,
      filters: kind === 'random' ? filters : null,
      paidWith: paid ? 'lp' : 'none',
      cost: paid ? DRAW_PRICE : 0,
      entryId: paid ? entryDoc.id : null,
    }
    transaction.set(drawDoc, draw)
    transaction.set(
      holdingDoc,
      openHolding({
        cardId: card.id,
        cardName: card.name,
        cardKind: card.kind,
        uid,
        givenBy: by,
        givenVia: 'draw',
        drawId: drawDoc.id,
        active: card.hasHeldEffect,
      }),
    )
    if (!card.isRepeatable) {
      transaction.update(ref, { holder: { uid, userCardId: holdingDoc.id } })
    }
    if (lpAfter !== null) {
      transaction.set(
        entryDoc,
        newLedgerEntry({
          currency: 'lp',
          account: uid,
          delta: -DRAW_PRICE,
          balanceAfter: lpAfter,
          source: 'draw',
          drawId: drawDoc.id,
          by,
        }),
      )
      transaction.update(doc(db, USERS_COLLECTION, uid), { lp: lpAfter, lpEntryId: entryDoc.id })
    }
    return { drawId: drawDoc.id, holdingId: holdingDoc.id, card }
  })
}

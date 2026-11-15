import {
  arrayUnion,
  collection,
  doc,
  type DocumentReference,
  type Firestore,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type Transaction,
  updateDoc,
  type WithFieldValue,
} from 'firebase/firestore'

import {
  type BalanceAccount,
  LEDGER_COLLECTION,
  newLedgerEntry,
  partyPurseRef,
  readBalance,
  setBalance,
} from '@/features/balances/api'
import { BalanceError } from '@/features/balances/errors'
import { PARTY_ACCOUNT } from '@/features/balances/schema'
import { cardRef } from '@/features/cards/api'
import { isAvailable } from '@/features/cards/pool'
import { type Card, type Definition, isCard } from '@/features/cards/schema'
import { DRAWS_COLLECTION } from '@/features/draws/api'
import {
  isCursedPackType,
  PACK_COST_MAX,
  type PackOpening,
  packOpeningConverter,
  type StoredPackOpening,
} from '@/features/draws/schema'
import { HOLDINGS_COLLECTION, openHolding } from '@/features/hands/api'
import { openPackIdOnServer, tableRef } from '@/features/table/api'
import { openPackIdOf } from '@/features/table/schema'
import { profileRef } from '@/features/users/api'
import { firebaseCode } from '@/lib/firestore/errors'
import type { RandomSource } from '@/lib/random'

import type { PackDef } from './catalog'
import { buildPack } from './contents'
import { type PackCurrency, PackError } from './errors'

/** One pack opening, validated and with the document ID as `id`. */
export function packOpeningRef(db: Firestore, drawId: string): DocumentReference<PackOpening> {
  return doc(db, DRAWS_COLLECTION, drawId).withConverter(packOpeningConverter)
}

/** A plain ref for writes: the converted ref's type would ask for the `id` field, which is never stored. */
function writablePack(db: Firestore, drawId?: string): DocumentReference {
  const draws = collection(db, DRAWS_COLLECTION)
  return drawId === undefined ? doc(draws) : doc(draws, drawId)
}

/** How a pack is paid: an amount of the hand owner's LP or the party's GP. An amount of 0 is free. */
export type PackPaymentInput = { currency: PackCurrency; amount: number }

export type OpenPackInput = {
  def: PackDef
  /** The hand the pack is for. */
  uid: string
  /** The signed-in user: the hand's owner, or the DM. */
  by: string
  /** `null` is free (the DM only). A player pays the pack's LP price; the rules check it. */
  payment: PackPaymentInput | null
  /** The live cards: the pack is built from those in the pool. */
  cards: readonly Card[]
  /** Defaults to the browser's cryptographic random numbers. */
  random?: RandomSource
}

/** At most this many tries: a shown card taken meanwhile is replaced, and a moved balance is read again. */
const MAX_ATTEMPTS = 5

/** A shown card is no longer in the pool: someone took it, or it was retired. Only used inside `openPack`. */
class TakenError extends Error {
  override readonly name = 'TakenError'
  readonly cardId: string

  constructor(cardId: string) {
    super(`Card ${cardId} is no longer in the pool`)
    this.cardId = cardId
  }
}

/**
 * True for a definition a pack cannot show now: missing, a True Word, not active, or the one copy of a card that someone
 * holds. The pack flags were checked when the pack was built, and they cannot change while it is open.
 */
function isTaken(definition: Definition | undefined): boolean {
  return !definition || !isCard(definition) || !isAvailable(definition)
}

const accountOf = (currency: PackCurrency, uid: string): BalanceAccount =>
  currency === 'lp' ? { currency: 'lp', uid } : { currency: 'gp' }

/** Reads a balance inside the transaction, as the pack sees it: a non-player's LP is `not-a-player`. */
async function readPackBalance(
  transaction: Transaction,
  db: Firestore,
  account: BalanceAccount,
): Promise<number> {
  try {
    return await readBalance(transaction, db, account)
  } catch (error) {
    if (error instanceof BalanceError && error.kind === 'not-a-player') {
      throw new PackError('not-a-player')
    }
    throw error
  }
}

/**
 * Opens a pack into a hand, in one transaction that writes the open pack record, takes the table, and, when paid,
 * writes the ledger entry and the new balance, as the rules require. Returns the record's ID.
 *
 * The cards are picked outside the transaction (`buildPack`), which re-reads them: a shown card that someone took
 * meanwhile is replaced by another pick, so the opener is charged once. After a denied commit, the table, the shown
 * cards and the balance are read from the server to tell the reason: an open pack is `busy`, a taken card picks
 * again, a moved balance tries again, and anything else is thrown.
 *
 * Throws `PackError`: `busy`, `not-enough-cards`, `insufficient`, `not-a-player`, `invalid-amount` and
 * `retries-exhausted`.
 */
export async function openPack(db: Firestore, input: OpenPackInput): Promise<string> {
  const amount = input.payment?.amount ?? 0
  if (!Number.isInteger(amount) || amount < 0 || amount > PACK_COST_MAX) {
    throw new PackError('invalid-amount')
  }
  const taken = new Set<string>()
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const offered = buildPack(
      input.def,
      input.cards.filter((card) => !taken.has(card.id)),
      input.random,
    )
    if (offered === null) throw new PackError('not-enough-cards')
    const read = { balance: null as number | null }
    try {
      return await openOnce(db, input, offered, read)
    } catch (error) {
      if (error instanceof TakenError) {
        taken.add(error.cardId)
        continue
      }
      if (firebaseCode(error) !== 'permission-denied') throw error
      if ((await openPackIdOnServer(db)) !== null) throw new PackError('busy')
      const takenNow = await firstTakenOnServer(db, offered)
      if (takenNow !== null) {
        taken.add(takenNow)
        continue
      }
      if (read.balance === null || input.payment === null) throw error
      const account = accountOf(input.payment.currency, input.uid)
      if ((await serverBalance(db, account)) === read.balance) throw error
    }
  }
  throw new PackError('retries-exhausted')
}

async function firstTakenOnServer(
  db: Firestore,
  cardIds: readonly string[],
): Promise<string | null> {
  for (const cardId of cardIds) {
    if (isTaken((await getDocFromServer(cardRef(db, cardId))).data())) return cardId
  }
  return null
}

/** The balance as the server has it now. A missing purse holds 0 GP; a missing profile cannot say. */
async function serverBalance(db: Firestore, account: BalanceAccount): Promise<number | null> {
  if (account.currency === 'gp') return (await getDocFromServer(partyPurseRef(db))).data()?.gp ?? 0
  return (await getDocFromServer(profileRef(db, account.uid))).data()?.lp ?? null
}

function openOnce(
  db: Firestore,
  { def, uid, by, payment }: OpenPackInput,
  offered: string[],
  read: { balance: number | null },
): Promise<string> {
  const packDoc = writablePack(db)
  const entryDoc = doc(collection(db, LEDGER_COLLECTION))
  const amount = payment?.amount ?? 0
  return runTransaction(db, async (transaction) => {
    if (openPackIdOf((await transaction.get(tableRef(db))).data()) !== null) {
      throw new PackError('busy')
    }
    for (const cardId of offered) {
      if (isTaken((await transaction.get(cardRef(db, cardId))).data())) throw new TakenError(cardId)
    }
    const account = payment !== null && amount > 0 ? accountOf(payment.currency, uid) : null
    let balanceAfter: number | null = null
    if (account !== null && payment !== null) {
      const balance = await readPackBalance(transaction, db, account)
      read.balance = balance
      if (balance < amount) {
        throw new PackError('insufficient', { currency: payment.currency, balance, amount })
      }
      balanceAfter = balance - amount
    }

    const pack: WithFieldValue<StoredPackOpening> = {
      kind: 'pack',
      uid,
      by,
      at: serverTimestamp(),
      packType: def.type,
      setCode: def.setCode,
      mechanicPack: def.mechanicPack,
      offered,
      revealed: [],
      paidWith: account === null || payment === null ? 'none' : payment.currency,
      cost: account === null ? 0 : amount,
      entryId: account === null ? null : entryDoc.id,
      status: 'open',
      closedAt: null,
      closedBy: null,
      chosen: null,
      cursed: null,
      refundEntryId: null,
    }
    transaction.set(packDoc, pack)
    transaction.set(tableRef(db), { openPackId: packDoc.id })
    if (account !== null && balanceAfter !== null) {
      transaction.set(
        entryDoc,
        newLedgerEntry({
          currency: account.currency,
          account: account.currency === 'lp' ? uid : PARTY_ACCOUNT,
          delta: -amount,
          balanceAfter,
          source: 'pack',
          drawId: packDoc.id,
          by,
        }),
      )
      setBalance(transaction, db, account, balanceAfter, entryDoc.id)
    }
    return packDoc.id
  })
}

/**
 * Turns one card of an open pack face up: its position is added to `revealed`, once. A plain update, not a
 * transaction: `arrayUnion` merges a turn by the owner and one by the DM at the same moment, and the rules check
 * each step. Only the hand's owner and the DM may turn cards.
 */
export function turnPackCard(db: Firestore, drawId: string, position: number): Promise<void> {
  return updateDoc(writablePack(db, drawId), { revealed: arrayUnion(position) })
}

/** Reads the pack inside the transaction; one that is missing or no longer open is `closed`. */
async function readOpenPack(
  transaction: Transaction,
  db: Firestore,
  drawId: string,
): Promise<PackOpening> {
  const pack = (await transaction.get(packOpeningRef(db, drawId))).data()
  if (!pack || pack.status !== 'open') throw new PackError('closed')
  return pack
}

/** After a denied commit: a pack that ended meanwhile is `closed`; anything else is the denial itself. */
async function explainPackDenial(db: Firestore, drawId: string, error: unknown): Promise<unknown> {
  if (firebaseCode(error) !== 'permission-denied') return error
  try {
    const pack = (await getDocFromServer(packOpeningRef(db, drawId))).data()
    return pack?.status === 'open' ? error : new PackError('closed')
  } catch {
    return error
  }
}

export type ChoosePackCardInput = {
  drawId: string
  cardId: string
  /** The signed-in user: the hand's owner, or the DM. */
  by: string
}

/**
 * Chooses a card from an open pack and ends it, in one transaction: the card goes to the end of the hand (a normal
 * card leaves the pool), a Cursed type's mandatory Cursed card goes with it, the pack is marked chosen, and the
 * table is freed. Returns the chosen card's holding ID.
 *
 * Throws `PackError`: `closed`, `not-all-turned`, `invalid-choice` (not shown, or the Cursed card) and
 * `unavailable` (retired or taken meanwhile).
 */
export async function choosePackCard(db: Firestore, input: ChoosePackCardInput): Promise<string> {
  try {
    return await chooseOnce(db, input)
  } catch (error) {
    throw await explainPackDenial(db, input.drawId, error)
  }
}

function chooseOnce(db: Firestore, { drawId, cardId, by }: ChoosePackCardInput): Promise<string> {
  const chosenDoc = doc(collection(db, HOLDINGS_COLLECTION))
  const cursedDoc = doc(collection(db, HOLDINGS_COLLECTION))
  return runTransaction(db, async (transaction) => {
    const pack = await readOpenPack(transaction, db, drawId)
    if (new Set(pack.revealed).size < pack.offered.length) throw new PackError('not-all-turned')
    if (!pack.offered.includes(cardId)) throw new PackError('invalid-choice')
    const shown = new Map<string, Card | undefined>()
    for (const id of pack.offered) {
      const definition = (await transaction.get(cardRef(db, id))).data()
      shown.set(id, definition && isCard(definition) ? definition : undefined)
    }
    const card = shown.get(cardId)
    if (card?.kind === 'cursed') throw new PackError('invalid-choice')
    if (card === undefined || isTaken(card)) throw new PackError('unavailable')
    let curse: Card | null = null
    if (isCursedPackType(pack.packType)) {
      curse = [...shown.values()].find((shownCard) => shownCard?.kind === 'cursed') ?? null
      if (curse === null || !isAvailable(curse)) throw new PackError('unavailable')
    }

    transaction.set(
      chosenDoc,
      openHolding({
        cardId: card.id,
        cardName: card.name,
        cardKind: card.kind,
        uid: pack.uid,
        givenBy: by,
        givenVia: 'pack',
        drawId,
        active: card.hasHeldEffect,
      }),
    )
    if (curse !== null) {
      transaction.set(
        cursedDoc,
        openHolding({
          cardId: curse.id,
          cardName: curse.name,
          cardKind: 'cursed',
          uid: pack.uid,
          givenBy: by,
          givenVia: 'pack',
          drawId,
          active: curse.hasHeldEffect,
        }),
      )
      if (!curse.isRepeatable) {
        transaction.update(cardRef(db, curse.id), {
          holder: { uid: pack.uid, userCardId: cursedDoc.id },
        })
      }
    }
    if (!card.isRepeatable) {
      transaction.update(cardRef(db, card.id), {
        holder: { uid: pack.uid, userCardId: chosenDoc.id },
      })
    }
    transaction.update(writablePack(db, drawId), {
      status: 'chosen',
      closedAt: serverTimestamp(),
      closedBy: by,
      chosen: {
        cardId: card.id,
        cardName: card.name,
        cardKind: card.kind,
        holdingId: chosenDoc.id,
      },
      cursed:
        curse === null ? null : { cardId: curse.id, cardName: curse.name, holdingId: cursedDoc.id },
    })
    transaction.set(tableRef(db), { openPackId: null })
    return chosenDoc.id
  })
}

export type CancelPackInput = {
  drawId: string
  /** The signed-in DM. */
  by: string
}

/**
 * Cancels an open pack (the DM only), in one transaction: no card is given, the payment goes back to the balance it
 * came from with a refund entry, the pack is marked cancelled, and the table is freed. Throws `PackError('closed')`
 * when the pack ended meanwhile.
 */
export async function cancelPack(db: Firestore, input: CancelPackInput): Promise<void> {
  try {
    await cancelOnce(db, input)
  } catch (error) {
    throw await explainPackDenial(db, input.drawId, error)
  }
}

function cancelOnce(db: Firestore, { drawId, by }: CancelPackInput): Promise<void> {
  const refundDoc = doc(collection(db, LEDGER_COLLECTION))
  return runTransaction(db, async (transaction) => {
    const pack = await readOpenPack(transaction, db, drawId)
    const paid = pack.paidWith !== 'none'
    const account = pack.paidWith === 'none' ? null : accountOf(pack.paidWith, pack.uid)
    const balance = account === null ? null : await readPackBalance(transaction, db, account)

    transaction.update(writablePack(db, drawId), {
      status: 'cancelled',
      closedAt: serverTimestamp(),
      closedBy: by,
      refundEntryId: paid ? refundDoc.id : null,
    })
    if (account !== null && balance !== null) {
      const after = balance + pack.cost
      transaction.set(
        refundDoc,
        newLedgerEntry({
          currency: account.currency,
          account: account.currency === 'lp' ? pack.uid : PARTY_ACCOUNT,
          delta: pack.cost,
          balanceAfter: after,
          source: 'pack',
          drawId,
          by,
        }),
      )
      setBalance(transaction, db, account, after, refundDoc.id)
    }
    transaction.set(tableRef(db), { openPackId: null })
  })
}

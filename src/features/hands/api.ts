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
  updateDoc,
  where,
  type WithFieldValue,
} from 'firebase/firestore'

import { cardRef } from '@/features/cards/api'
import type { Card } from '@/features/cards/schema'
import { firebaseCode } from '@/lib/firestore/errors'
import { cleanText } from '@/lib/text'

import { HoldingError } from './errors'
import { HOLDING_LIMITS, type Holding, holdingConverter, type StoredHolding } from './schema'

/** Keep in step with `firestore.rules`. */
export const HOLDINGS_COLLECTION = 'userCards'

/** Every holding, open or closed, validated and with the document ID as `id`. */
export function holdingsRef(db: Firestore): CollectionReference<Holding> {
  return collection(db, HOLDINGS_COLLECTION).withConverter(holdingConverter)
}

export function holdingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return doc(holdingsRef(db), holdingId)
}

/** The open holdings: every card in every hand. One filter, so no composite index is needed. */
export function openHoldingsQuery(db: Firestore): Query<Holding> {
  return query(holdingsRef(db), where('returnedAt', '==', null))
}

/** A plain ref for writes: the converted ref's type would ask for the `id` field, which is never stored. */
function writableHolding(db: Firestore, holdingId?: string): DocumentReference {
  const holdings = collection(db, HOLDINGS_COLLECTION)
  return holdingId === undefined ? doc(holdings) : doc(holdings, holdingId)
}

/** A new, open holding given now. */
function openHolding(
  fields: Pick<StoredHolding, 'cardId' | 'cardName' | 'cardKind' | 'uid' | 'givenBy'> &
    Partial<
      Pick<StoredHolding, 'givenVia' | 'transferredFrom' | 'active' | 'note' | 'costOverride'>
    >,
): WithFieldValue<StoredHolding> {
  return {
    givenVia: 'dm',
    transferredFrom: null,
    active: false,
    note: '',
    costOverride: null,
    ...fields,
    givenAt: serverTimestamp(),
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    usedOn: null,
    transferredTo: null,
  }
}

async function readCard(transaction: Transaction, ref: DocumentReference<Card>): Promise<Card> {
  const card = (await transaction.get(ref)).data()
  if (!card) throw new HoldingError('card-missing')
  return card
}

async function readOpenHolding(
  transaction: Transaction,
  ref: DocumentReference<Holding>,
): Promise<Holding> {
  const holding = (await transaction.get(ref)).data()
  if (!holding || holding.returnedAt !== null || holding.returnReason !== null) {
    throw new HoldingError('closed')
  }
  return holding
}

/** True when a normal card's holder is this holding, so the holding's closing moves or releases the card. */
function isHolderOf(card: Card, holdingId: string): boolean {
  return card.kind === 'normal' && card.holder?.userCardId === holdingId
}

export type GiveCardInput = {
  cardId: string
  /** The receiver. */
  uid: string
  /** The signed-in DM. */
  by: string
  /**
   * Give a held normal card anyway, as an extra copy that leaves its holder alone. Without it, a held normal
   * card fails with `HoldingError('taken')`.
   */
  allowExtraCopy?: boolean
}

/**
 * Gives a card, in one transaction that re-reads the card. A normal card in the pool gets the new holding as its
 * holder; Blessed and Cursed cards never get one. Returns the new holding's ID.
 *
 * When two devices give the same pool card at once, the loser's commit can reach the server after the winner's.
 * The rules then deny it (the card is no longer in the pool) before the transaction could retry, so a denied
 * give re-reads the card from the server and reports `taken` when someone now holds it.
 */
export async function giveCard(db: Firestore, input: GiveCardInput): Promise<string> {
  try {
    return await giveCardOnce(db, input)
  } catch (error) {
    if (!input.allowExtraCopy && firebaseCode(error) === 'permission-denied') {
      const card = (await getDocFromServer(cardRef(db, input.cardId))).data()
      if (card?.kind === 'normal' && card.holder !== null) {
        throw new HoldingError('taken', card.holder.uid)
      }
    }
    throw error
  }
}

function giveCardOnce(
  db: Firestore,
  { cardId, uid, by, allowExtraCopy = false }: GiveCardInput,
): Promise<string> {
  const card = cardRef(db, cardId)
  const holding = writableHolding(db)
  return runTransaction(db, async (transaction) => {
    const current = await readCard(transaction, card)
    const holder = current.kind === 'normal' ? current.holder : null
    if (holder !== null && !allowExtraCopy) throw new HoldingError('taken', holder.uid)
    transaction.set(
      holding,
      openHolding({
        cardId,
        cardName: current.name,
        cardKind: current.kind,
        uid,
        givenBy: by,
      }),
    )
    if (current.kind === 'normal' && holder === null) {
      transaction.update(card, { holder: { uid, userCardId: holding.id } })
    }
    return holding.id
  })
}

export type CloseHoldingInput = {
  holdingId: string
  /** The signed-in user: the holder, or the DM. */
  by: string
} & (
  | {
      reason: 'used'
      /** On which character, as typed; blank means not given. */ usedOn?: string | null
    }
  | { reason: 'discarded' }
)

/**
 * Uses or discards a held card, in one transaction that re-reads the holding and the card. A normal card whose
 * holder is this holding returns to the pool; an extra copy, a Blessed or a Cursed card leaves the card alone.
 * Fails with `HoldingError('closed')` when the holding was closed meanwhile.
 */
export async function closeHolding(db: Firestore, input: CloseHoldingInput): Promise<void> {
  const { holdingId, by, reason } = input
  const ref = holdingRef(db, holdingId)
  await runTransaction(db, async (transaction) => {
    const holding = await readOpenHolding(transaction, ref)
    const card = cardRef(db, holding.cardId)
    const current = holding.cardKind === 'normal' ? await readCard(transaction, card) : null
    transaction.update(writableHolding(db, holdingId), {
      returnedAt: serverTimestamp(),
      returnedBy: by,
      returnReason: reason,
      usedOn: reason === 'used' ? cleanText(input.usedOn, HOLDING_LIMITS.usedOn) : null,
    })
    if (current && isHolderOf(current, holdingId)) transaction.update(card, { holder: null })
  })
}

export type TransferHoldingInput = {
  holdingId: string
  /** The receiver. */
  toUid: string
  /** The signed-in DM. */
  by: string
}

/**
 * Moves a held card to another player's hand, in one transaction: the old holding closes as transferred, and a
 * new holding opens at the end of the receiver's hand with the same note, cost override and active state. A
 * normal card's holder moves with it when it pointed at the old holding. Returns the new holding's ID.
 */
export async function transferHolding(
  db: Firestore,
  { holdingId, toUid, by }: TransferHoldingInput,
): Promise<string> {
  const ref = holdingRef(db, holdingId)
  const next = writableHolding(db)
  return runTransaction(db, async (transaction) => {
    const holding = await readOpenHolding(transaction, ref)
    const card = cardRef(db, holding.cardId)
    const current = holding.cardKind === 'normal' ? await readCard(transaction, card) : null
    transaction.update(writableHolding(db, holdingId), {
      returnedAt: serverTimestamp(),
      returnedBy: by,
      returnReason: 'transferred',
      transferredTo: next.id,
    })
    transaction.set(
      next,
      openHolding({
        cardId: holding.cardId,
        cardName: holding.cardName,
        cardKind: holding.cardKind,
        uid: toUid,
        givenBy: by,
        givenVia: 'transfer',
        transferredFrom: holdingId,
        active: holding.active,
        note: holding.note,
        costOverride: holding.costOverride,
      }),
    )
    if (current && isHolderOf(current, holdingId)) {
      transaction.update(card, { holder: { uid: toUid, userCardId: next.id } })
    }
    return next.id
  })
}

// The plain updates below are single-field writes with no transaction: they work offline, and the subscription
// shows them at once as pending writes.

/** Saves the holder's note on a held card (holder or DM). */
export function setHoldingNote(db: Firestore, holdingId: string, note: string): Promise<void> {
  return updateDoc(writableHolding(db, holdingId), {
    note: Array.from(note).slice(0, HOLDING_LIMITS.note).join(''),
  })
}

/** Switches a held card active or inactive (DM). */
export function setHoldingActive(db: Firestore, holdingId: string, active: boolean): Promise<void> {
  return updateDoc(writableHolding(db, holdingId), { active })
}

/** Sets the cost of a held card in this hand (DM). A blank value restores the card's own cost. */
export function setHoldingCost(db: Firestore, holdingId: string, cost: string): Promise<void> {
  return updateDoc(writableHolding(db, holdingId), {
    costOverride: cleanText(cost, HOLDING_LIMITS.costOverride),
  })
}

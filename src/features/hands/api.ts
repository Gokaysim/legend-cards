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

import { LEDGER_COLLECTION, newLedgerEntry } from '@/features/balances/api'
import { cardRef } from '@/features/cards/api'
import { visibleText } from '@/features/cards/text'
import { MAX_USE_AMOUNT, priceAllows, priceOfUse } from '@/features/cards/display'
import { readUseTarget, setUseEffect } from '@/features/characters/api'
import type { UseTarget } from '@/features/characters/useTarget'
import type { Card } from '@/features/cards/schema'
import { explainDenial } from '@/features/table/api'
import { profileRef, USERS_COLLECTION } from '@/features/users/api'
import { firebaseCode } from '@/lib/firestore/errors'
import { cleanText } from '@/lib/text'

import { HoldingError } from './errors'
import { HOLDING_LIMITS, type Holding, holdingConverter, type NewHolding } from './schema'

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

/**
 * A new, open holding given now: the fields every way of giving writes. Defaults to a DM give, inactive, without
 * a note or a cost. The draws feature composes it into its draw transaction.
 */
export function openHolding(
  fields: Pick<NewHolding, 'cardId' | 'cardName' | 'cardKind' | 'uid' | 'givenBy'> &
    Partial<
      Pick<
        NewHolding,
        'givenVia' | 'transferredFrom' | 'drawId' | 'active' | 'note' | 'costOverride'
      >
    >,
): WithFieldValue<NewHolding> {
  return {
    givenVia: 'dm',
    transferredFrom: null,
    drawId: null,
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
        throw new HoldingError('taken', { holderUid: card.holder.uid })
      }
    }
    throw await explainDenial(db, error)
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
    if (holder !== null && !allowExtraCopy) {
      throw new HoldingError('taken', { holderUid: holder.uid })
    }
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
      /** On which character the card was used. None by default. */
      target?: UseTarget
      /**
       * Adds the card's effect to the chosen character in the same step (spec: card-holdings, "Adding the effect of a
       * card's use"). Ignored without a chosen character.
       */
      addEffect?: boolean
      /**
       * The LP the user confirmed for the use, taken from the holder's LP: the price of the card's cost in this hand
       * for the holder's own use, any whole amount for the DM, 0 for free (spec: card-holdings, "The price of a
       * use").
       */
      amount: number
    }
  | { reason: 'discarded' }
)

/** At most this many tries when the rules deny a use because another device moved the holder's LP first. */
const MAX_USE_ATTEMPTS = 3

/**
 * Uses or discards a held card, in one transaction that re-reads the holding and the card. A normal card whose
 * holder is this holding returns to the pool; an extra copy, a Blessed or a Cursed card leaves the card alone.
 *
 * A use pays its amount from the holder's LP in the same transaction: the ledger entry, the holder's new LP, and
 * the holding's `useCost` and `useEntryId`, as the rules require (design D6 of `pay-lp-on-use`). When another
 * device moves that LP between the transaction's read and its commit, the rules deny the commit before the
 * transaction could retry, so a denied use reads the LP from the server and tries again when it moved.
 *
 * Fails with `HoldingError`:
 * - `closed` when the holding was closed meanwhile
 * - `insufficient`, with the LP and the amount, when the holder's LP is below the amount
 * - `price-changed`, with the price now, when the holder's own use confirms another fixed price
 * - `invalid-amount` for an amount the price does not allow, or out of range
 * - `not-a-player` for a paid use of a card in the DM's own hand
 *
 * Fails with `TableBusyError` while a pack is open.
 */
export async function closeHolding(db: Firestore, input: CloseHoldingInput): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    const read: LpRead = { uid: null, lp: null }
    try {
      await closeHoldingOnce(db, input, read)
      return
    } catch (error) {
      const explained = await explainDenial(db, error)
      if (
        explained !== error ||
        firebaseCode(error) !== 'permission-denied' ||
        attempt >= MAX_USE_ATTEMPTS ||
        read.uid === null ||
        (await serverLp(db, read.uid)) === read.lp
      ) {
        throw explained
      }
    }
  }
}

/** The LP a use's transaction read, so a denied commit can tell whether the LP moved meanwhile. */
type LpRead = { uid: string | null; lp: number | null }

async function serverLp(db: Firestore, uid: string): Promise<number | null> {
  return (await getDocFromServer(profileRef(db, uid))).data()?.lp ?? null
}

function closeHoldingOnce(db: Firestore, input: CloseHoldingInput, read: LpRead): Promise<void> {
  const { holdingId, by, reason } = input
  const ref = holdingRef(db, holdingId)
  const entryDoc = doc(collection(db, LEDGER_COLLECTION))
  return runTransaction(db, async (transaction) => {
    const holding = await readOpenHolding(transaction, ref)
    const card = cardRef(db, holding.cardId)
    // A use reads the card of every kind, for its cost; a discard only a normal card, for its holder.
    const current =
      reason === 'used' || holding.cardKind === 'normal' ? await readCard(transaction, card) : null
    const usedOn = reason === 'used' ? await readUseTarget(transaction, db, input.target) : null
    const closing = {
      returnedAt: serverTimestamp(),
      returnedBy: by,
      returnReason: reason,
      usedOn: usedOn?.name ?? null,
    }
    if (reason === 'used' && current) {
      const { amount } = input
      if (!Number.isInteger(amount) || amount < 0 || amount > MAX_USE_AMOUNT) {
        throw new HoldingError('invalid-amount')
      }
      const owner = (await transaction.get(profileRef(db, holding.uid))).data()
      const isPlayer = owner?.role === 'player'
      if (!isPlayer && amount > 0) throw new HoldingError('not-a-player')
      if (isPlayer && by === holding.uid) {
        const price = priceOfUse(holding.costOverride ?? current.cost)
        if (!priceAllows(price, amount)) {
          throw price.kind === 'fixed'
            ? new HoldingError('price-changed', { price: price.amount })
            : new HoldingError('invalid-amount')
        }
      }
      let useEntryId: string | null = null
      if (amount > 0 && owner) {
        read.uid = holding.uid
        read.lp = owner.lp
        if (owner.lp < amount) {
          throw new HoldingError('insufficient', { shortfall: { balance: owner.lp, amount } })
        }
        useEntryId = entryDoc.id
        transaction.set(
          entryDoc,
          newLedgerEntry({
            currency: 'lp',
            account: holding.uid,
            delta: -amount,
            balanceAfter: owner.lp - amount,
            source: 'use',
            drawId: holdingId,
            by,
          }),
        )
        transaction.update(doc(db, USERS_COLLECTION, holding.uid), {
          lp: owner.lp - amount,
          lpEntryId: entryDoc.id,
        })
      }
      transaction.update(writableHolding(db, holdingId), {
        ...closing,
        useCost: amount,
        useEntryId,
        // Written only for a chosen character, so a typed name stores no field (design D7 of add-characters).
        ...(usedOn?.characterId ? { usedOnCharacterId: usedOn.characterId } : {}),
      })
      if (input.addEffect === true) {
        setUseEffect(transaction, db, {
          target: usedOn,
          source: 'card',
          sourceId: holdingId,
          content: {
            name: current.name,
            text: visibleText(current.text),
            cursed: current.kind === 'cursed',
          },
          by,
        })
      }
    } else {
      transaction.update(writableHolding(db, holdingId), closing)
    }
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
 * normal card's holder moves with it when it pointed at the old holding. Returns the new holding's ID. Fails with
 * `TableBusyError` while a pack is open.
 */
export async function transferHolding(db: Firestore, input: TransferHoldingInput): Promise<string> {
  try {
    return await transferHoldingOnce(db, input)
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

function transferHoldingOnce(
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

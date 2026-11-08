import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type Transaction,
  type WithFieldValue,
} from 'firebase/firestore'

import { profileRef, USERS_COLLECTION } from '@/features/users/api'
import { firebaseCode } from '@/lib/firestore/errors'
import { cleanText } from '@/lib/text'

import { BalanceError } from './errors'
import {
  BALANCE_LIMITS,
  type LedgerEntry,
  ledgerEntryConverter,
  PARTY_ACCOUNT,
  type PartyPurse,
  partyPurseConverter,
  type StoredLedgerEntry,
} from './schema'

/** Keep in step with `firestore.rules`. */
export const LEDGER_COLLECTION = 'ledger'
export const PARTY_COLLECTION = 'party'
export const PARTY_PURSE_ID = 'main'

/** Every ledger entry, validated and with the document ID as `id`. */
export function ledgerRef(db: Firestore): CollectionReference<LedgerEntry> {
  return collection(db, LEDGER_COLLECTION).withConverter(ledgerEntryConverter)
}

/** The party purse. It does not exist before the first GP change. */
export function partyPurseRef(db: Firestore): DocumentReference<PartyPurse> {
  return doc(db, PARTY_COLLECTION, PARTY_PURSE_ID).withConverter(partyPurseConverter)
}

/** Whose balance changes: a player's LP, or the party's GP. */
export type BalanceAccount = { currency: 'lp'; uid: string } | { currency: 'gp' }

export type ChangeBalanceInput = {
  account: BalanceAccount
  /** Positive to add, negative to subtract: a whole number from 1 to `BALANCE_LIMITS.amount` either way. */
  delta: number
  /** The DM's reason. It is trimmed and must not be blank. */
  reason: string
  /** The signed-in DM. */
  by: string
}

/** True for an amount the DM may add or subtract in one change. */
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= BALANCE_LIMITS.amount
}

/** At most this many tries when the rules deny a change because another device changed the balance first. */
const MAX_ATTEMPTS = 3

/**
 * Changes a balance by `delta`, in one transaction that writes the ledger entry and the balance pointing at it, as
 * the rules require. Returns the new entry's ID.
 *
 * Throws `BalanceError`:
 * - `invalid` for a bad amount or a blank reason
 * - `not-a-player` for LP of someone who is not a player
 * - `insufficient`, with the balance, when the result would go below 0
 *
 * When two devices change the same balance at once, the loser's commit reaches the server after the winner's. The
 * rules then deny it, because its change no longer matches the stored balance, before the transaction could retry.
 * So after a denial, the balance is read from the server: if it moved since this attempt read it, the change runs
 * again; if not, the denial was real and is thrown.
 */
export async function changeBalance(db: Firestore, input: ChangeBalanceInput): Promise<string> {
  const reason = cleanText(input.reason, BALANCE_LIMITS.reason)
  if (!isValidAmount(Math.abs(input.delta)) || reason === null) throw new BalanceError('invalid')

  for (let attempt = 1; ; attempt += 1) {
    const read = { balance: null as number | null }
    try {
      return await changeBalanceOnce(db, { ...input, reason }, read)
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || firebaseCode(error) !== 'permission-denied') throw error
      if (read.balance === null || (await serverBalance(db, input.account)) === read.balance) {
        throw error
      }
    }
  }
}

function changeBalanceOnce(
  db: Firestore,
  { account, delta, reason, by }: ChangeBalanceInput,
  read: { balance: number | null },
): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const before = await readBalance(transaction, db, account)
    read.balance = before
    const after = before + delta
    if (after < 0) throw new BalanceError('insufficient', before)

    const entryRef = doc(collection(db, LEDGER_COLLECTION))
    const entry: WithFieldValue<StoredLedgerEntry> = {
      currency: account.currency,
      account: account.currency === 'lp' ? account.uid : PARTY_ACCOUNT,
      delta,
      balanceAfter: after,
      source: 'manual',
      reason,
      by,
      at: serverTimestamp(),
    }
    transaction.set(entryRef, entry)
    if (account.currency === 'lp') {
      transaction.update(doc(db, USERS_COLLECTION, account.uid), {
        lp: after,
        lpEntryId: entryRef.id,
      })
    } else {
      transaction.set(doc(db, PARTY_COLLECTION, PARTY_PURSE_ID), {
        gp: after,
        gpEntryId: entryRef.id,
      })
    }
    return entryRef.id
  })
}

/** The balance inside the transaction. A missing purse holds 0 GP; LP belongs to players only. */
async function readBalance(
  transaction: Transaction,
  db: Firestore,
  account: BalanceAccount,
): Promise<number> {
  if (account.currency === 'gp') {
    return (await transaction.get(partyPurseRef(db))).data()?.gp ?? 0
  }
  const profile = (await transaction.get(profileRef(db, account.uid))).data()
  if (profile?.role !== 'player') throw new BalanceError('not-a-player')
  return profile.lp
}

/** The balance as the server has it now, or `null` when it cannot say (a missing profile). */
async function serverBalance(db: Firestore, account: BalanceAccount): Promise<number | null> {
  if (account.currency === 'gp') return (await getDocFromServer(partyPurseRef(db))).data()?.gp ?? 0
  return (await getDocFromServer(profileRef(db, account.uid))).data()?.lp ?? null
}

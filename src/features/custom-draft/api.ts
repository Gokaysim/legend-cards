import {
  collection,
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
import { CARDS_COLLECTION } from '@/features/cards/api'
import {
  type CustomCard,
  type CustomCardEffect,
  definitionConverter,
} from '@/features/cards/schema'
import { normalize } from '@/features/cards/text'
import { DEFINITION_CHANGES_COLLECTION } from '@/features/definitions/api'
import { DefinitionChangedError } from '@/features/definitions/errors'
import { type CardSnapshot, isPublicStep } from '@/features/definitions/schema'
import { DRAWS_COLLECTION } from '@/features/draws/api'
import { HOLDINGS_COLLECTION, openHolding } from '@/features/hands/api'
import { explainDenial, tableRef } from '@/features/table/api'
import { TableBusyError } from '@/features/table/errors'
import { openPackIdOf } from '@/features/table/schema'
import { firebaseCode } from '@/lib/firestore/errors'
import { cryptoRandom, type RandomSource } from '@/lib/random'

import {
  applyPick,
  cardCost,
  type CustomCost,
  customCardName,
  type EffectType,
  type EffectVariants,
  hasHeld,
  isDraftComplete,
  isFullyResolved,
  nextOptions,
  resolveEffects,
  startProgress,
} from './draftRules'
import {
  CUSTOM_EFFECTS_COLLECTION,
  CUSTOM_EFFECTS_DOC,
  type CustomEffects,
  customEffectsConverter,
} from './effectsSchema'
import { CustomDraftError } from './errors'
import {
  CUSTOM_DRAFT_COST_MAX,
  type CustomDraft,
  customDraftConverter,
  type PlayerCustomDraft,
  playerCustomDraftConverter,
  progressOf,
  type StoredCustomDraft,
} from './schema'

/** Each user's open Custom Card draft (design D3 of add-custom-card-draft). Keep in step with `firestore.rules`. */
export const PLAYER_CUSTOM_DRAFTS_COLLECTION = 'playerCustomDrafts'

/** The prefix of a Custom Card's ID. Keep in step with `firestore.rules`. */
export const CUSTOM_CARD_PREFIX = 'custom-'

export function customEffectsRef(db: Firestore): DocumentReference<CustomEffects> {
  return doc(db, CUSTOM_EFFECTS_COLLECTION, CUSTOM_EFFECTS_DOC).withConverter(
    customEffectsConverter,
  )
}

export function playerCustomDraftRef(
  db: Firestore,
  uid: string,
): DocumentReference<PlayerCustomDraft> {
  return doc(db, PLAYER_CUSTOM_DRAFTS_COLLECTION, uid).withConverter(playerCustomDraftConverter)
}

export function customDraftRef(db: Firestore, draftId: string): DocumentReference<CustomDraft> {
  return doc(db, DRAWS_COLLECTION, draftId).withConverter(customDraftConverter)
}

/** Every open Custom Card draft, at most one per user. Two equality filters, so no composite index is needed. */
export function openCustomDraftsQuery(db: Firestore): Query<CustomDraft> {
  return query(
    collection(db, DRAWS_COLLECTION).withConverter(customDraftConverter),
    where('kind', '==', 'customDraft'),
    where('status', '==', 'open'),
  )
}

/** Plain refs for writes: the converted refs' types would ask for the `id` field, which is never stored. */
const writableDraft = (db: Firestore, draftId: string) => doc(db, DRAWS_COLLECTION, draftId)
const writableLock = (db: Firestore, uid: string) => doc(db, PLAYER_CUSTOM_DRAFTS_COLLECTION, uid)

/** Throws `TableBusyError` when a pack is open: the table waits for it, the drafts included. */
async function ensureTableFree(transaction: Transaction, db: Firestore): Promise<void> {
  const openPackId = openPackIdOf((await transaction.get(tableRef(db))).data())
  if (openPackId !== null) throw new TableBusyError(openPackId)
}

/** The effect texts, read in the transaction: the rules check the options against the same document. */
async function readVariants(transaction: Transaction, db: Firestore): Promise<EffectVariants> {
  return (await transaction.get(customEffectsRef(db))).data()?.variants ?? {}
}

async function readOpenDraftId(
  transaction: Transaction,
  db: Firestore,
  uid: string,
): Promise<string | null> {
  return (await transaction.get(playerCustomDraftRef(db, uid))).data()?.openDraftId ?? null
}

/** A user's LP inside the transaction, a DM's included; a missing profile is `no-profile`. */
async function readLp(transaction: Transaction, db: Firestore, uid: string): Promise<number> {
  try {
    return await readBalance(transaction, db, { currency: 'lp', uid })
  } catch (error) {
    if (error instanceof BalanceError && error.kind === 'no-profile') {
      throw new CustomDraftError('no-profile')
    }
    throw error
  }
}

/** The draft, open, inside the transaction; one that is missing or ended is `closed`. */
async function readOpenDraft(
  transaction: Transaction,
  db: Firestore,
  draftId: string,
): Promise<CustomDraft> {
  const draft = (await transaction.get(customDraftRef(db, draftId))).data()
  if (!draft || draft.status !== 'open') throw new CustomDraftError('closed')
  return draft
}

/**
 * After a denied commit: a pack that is open now is `TableBusyError`, a draft that ended meanwhile is `closed`, and
 * anything else is the denial itself.
 */
async function explainDraftDenial(db: Firestore, draftId: string, error: unknown) {
  const explained = await explainDenial(db, error)
  if (explained !== error || firebaseCode(error) !== 'permission-denied') return explained
  try {
    const draft = (await getDocFromServer(customDraftRef(db, draftId))).data()
    return draft?.status === 'open' ? error : new CustomDraftError('closed')
  } catch {
    return error
  }
}

export type StartCustomDraftInput = {
  /** The user the draft is for. */
  uid: string
  /** The signed-in user: the player, or the DM. */
  by: string
  /** The card's draft cost: 1, 3 or 5. */
  base: CustomCost
  /** `'price'` charges the draft's cost in LP. The DM may give any amount up to the user's LP; 0 is free. */
  amount: number | 'price'
  /** Defaults to the browser's cryptographic random numbers. */
  random?: RandomSource
}

/**
 * Starts a Custom Card draft (spec: custom-cards, "Starting a Custom Card draft"), in one transaction: the open draft
 * with its first options, the user's open-draft lock, and when paid the ledger entry and the new LP. Returns the
 * draft's ID.
 *
 * Throws `CustomDraftError` (`no-effects`, `insufficient`, `no-profile`, `invalid-amount`, `draft-open`) and
 * `TableBusyError`.
 */
export async function startCustomDraft(
  db: Firestore,
  input: StartCustomDraftInput,
): Promise<string> {
  const { amount } = input
  if (
    amount !== 'price' &&
    (!Number.isInteger(amount) || amount < 0 || amount > CUSTOM_DRAFT_COST_MAX)
  ) {
    throw new CustomDraftError('invalid-amount')
  }
  const draftDoc = doc(collection(db, DRAWS_COLLECTION))
  const entryDoc = doc(collection(db, LEDGER_COLLECTION))
  try {
    return await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const variants = await readVariants(transaction, db)
      if ((await readOpenDraftId(transaction, db, input.uid)) !== null) {
        throw new CustomDraftError('draft-open')
      }
      const progress = startProgress(input.base)
      const offered = nextOptions(variants, progress, input.random ?? cryptoRandom)
      if (offered.length === 0) throw new CustomDraftError('no-effects')
      const cost = amount === 'price' ? input.base : amount
      let balanceAfter: number | null = null
      if (cost > 0) {
        const balance = await readLp(transaction, db, input.uid)
        if (balance < cost) throw new CustomDraftError('insufficient', { balance, amount: cost })
        balanceAfter = balance - cost
      }

      const draft: WithFieldValue<StoredCustomDraft> = {
        kind: 'customDraft',
        uid: input.uid,
        by: input.by,
        at: serverTimestamp(),
        base: input.base,
        paidWith: cost > 0 ? 'lp' : 'none',
        cost,
        entryId: cost > 0 ? entryDoc.id : null,
        pickTypes: [],
        pickCosts: [],
        offered,
        offerCost: progress.offerCost,
        required: progress.required,
        bonusLeft: progress.bonusLeft,
        status: 'open',
        closedAt: null,
        closedBy: null,
        cardId: null,
        holdingId: null,
        refundEntryId: null,
      }
      transaction.set(draftDoc, draft)
      transaction.set(writableLock(db, input.uid), { openDraftId: draftDoc.id })
      if (balanceAfter !== null) {
        transaction.set(
          entryDoc,
          newLedgerEntry({
            currency: 'lp',
            account: input.uid,
            delta: -cost,
            balanceAfter,
            source: 'customDraft',
            drawId: draftDoc.id,
            by: input.by,
          }),
        )
        setBalance(transaction, db, { currency: 'lp', uid: input.uid }, balanceAfter, entryDoc.id)
      }
      return draftDoc.id
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

export type PickEffectInput = {
  draftId: string
  type: EffectType
  /** The signed-in user: the draft's user, or the DM. */
  by: string
  /** Defaults to the browser's cryptographic random numbers. */
  random?: RandomSource
}

/** What a pick did: showed the next options, or finished the draft with the card in the user's hand. */
export type PickResult =
  { finished: false } | { finished: true; uid: string; cardId: string; holdingId: string }

/**
 * Picks one of the current step's options (spec: custom-cards, "Draft options"), in one transaction. A pick that does
 * not complete the card stores it with the next options. The last pick resolves the effects and makes the card
 * (design D4): the draft finishes naming the card, the card and its holding at the end of the user's hand are created,
 * and the lock is cleared.
 *
 * Throws `CustomDraftError` (`closed`, `invalid-choice`, `incomplete-texts`) and `TableBusyError`.
 */
export async function pickEffect(db: Firestore, input: PickEffectInput): Promise<PickResult> {
  const cardDoc = doc(
    db,
    CARDS_COLLECTION,
    `${CUSTOM_CARD_PREFIX}${doc(collection(db, CARDS_COLLECTION)).id}`,
  )
  const holdingDoc = doc(collection(db, HOLDINGS_COLLECTION))
  const random = input.random ?? cryptoRandom
  try {
    return await runTransaction(db, async (transaction): Promise<PickResult> => {
      await ensureTableFree(transaction, db)
      const variants = await readVariants(transaction, db)
      const draft = await readOpenDraft(transaction, db, input.draftId)
      if (!draft.offered.includes(input.type)) throw new CustomDraftError('invalid-choice')
      const next = applyPick(progressOf(draft), input.type)
      const counters = {
        pickTypes: next.picks.map((pick) => pick.type),
        pickCosts: next.picks.map((pick) => pick.cost),
        offerCost: next.offerCost,
        required: next.required,
        bonusLeft: next.bonusLeft,
      }
      if (!isDraftComplete(next)) {
        transaction.update(writableDraft(db, input.draftId), {
          ...counters,
          offered: nextOptions(variants, next, random),
        })
        return { finished: false }
      }

      const effects = resolveEffects(draft.base, next.picks, variants, random)
      if (!isFullyResolved(effects)) throw new CustomDraftError('incomplete-texts')
      const held = hasHeld(effects)
      const name = customCardName(draft.base)
      const card: WithFieldValue<Omit<CustomCard, 'id'>> = {
        kind: 'custom',
        name,
        nameKey: normalize(name),
        setCode: null,
        cost: `${cardCost(draft.base, effects).total}`,
        rarity: null,
        mechanicPack: null,
        text: '',
        status: 'active',
        changeId: null,
        picture: null,
        isInLibrary: false,
        isInDraws: false,
        isInSetPacks: false,
        isInMechanicPacks: false,
        isRepeatable: false,
        hasHeldEffect: held,
        hasUseEffect: true,
        isKeptOnUse: held,
        holder: { uid: draft.uid, userCardId: holdingDoc.id },
        base: draft.base,
        draftId: input.draftId,
        effects,
      }
      transaction.set(cardDoc, card)
      transaction.set(
        holdingDoc,
        openHolding({
          cardId: cardDoc.id,
          cardName: name,
          cardKind: 'custom',
          uid: draft.uid,
          givenBy: input.by,
          givenVia: 'draft',
          drawId: input.draftId,
          active: held,
        }),
      )
      transaction.update(writableDraft(db, input.draftId), {
        ...counters,
        offered: [],
        status: 'finished',
        closedAt: serverTimestamp(),
        closedBy: input.by,
        cardId: cardDoc.id,
        holdingId: holdingDoc.id,
      })
      transaction.set(writableLock(db, draft.uid), { openDraftId: null })
      return { finished: true, uid: draft.uid, cardId: cardDoc.id, holdingId: holdingDoc.id }
    })
  } catch (error) {
    throw await explainDraftDenial(db, input.draftId, error)
  }
}

export type CancelCustomDraftInput = {
  draftId: string
  /** The signed-in DM. */
  by: string
}

/**
 * Cancels an open draft (the DM only; spec: custom-cards, "The DM cancels a Custom Card draft"), in one transaction: it
 * ends without a card, the lock is cleared, and a paid draft's cost goes back to the user's LP with a refund entry.
 * Throws `CustomDraftError('closed')` and `TableBusyError`.
 */
export async function cancelCustomDraft(
  db: Firestore,
  input: CancelCustomDraftInput,
): Promise<void> {
  const refundDoc = doc(collection(db, LEDGER_COLLECTION))
  try {
    await runTransaction(db, async (transaction) => {
      await ensureTableFree(transaction, db)
      const draft = await readOpenDraft(transaction, db, input.draftId)
      const paid = draft.paidWith === 'lp'
      const balance = paid ? await readLp(transaction, db, draft.uid) : null

      transaction.update(writableDraft(db, input.draftId), {
        status: 'cancelled',
        closedAt: serverTimestamp(),
        closedBy: input.by,
        refundEntryId: paid ? refundDoc.id : null,
      })
      transaction.set(writableLock(db, draft.uid), { openDraftId: null })
      if (balance !== null) {
        const after = balance + draft.cost
        transaction.set(
          refundDoc,
          newLedgerEntry({
            currency: 'lp',
            account: draft.uid,
            delta: draft.cost,
            balanceAfter: after,
            source: 'customDraft',
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

/** A Custom Card as a definition change record keeps it. Keep in step with `cardSnapshot` in `firestore.rules`. */
function customSnapshotOf(card: Omit<CustomCard, 'id'>): CardSnapshot {
  return {
    kind: card.kind,
    name: card.name,
    nameKey: card.nameKey,
    setCode: null,
    cost: card.cost,
    rarity: null,
    mechanicPack: null,
    text: card.text,
    status: card.status,
    picture: null,
    isInLibrary: card.isInLibrary,
    isInDraws: card.isInDraws,
    isInSetPacks: card.isInSetPacks,
    isInMechanicPacks: card.isInMechanicPacks,
    isRepeatable: card.isRepeatable,
    hasHeldEffect: card.hasHeldEffect,
    hasUseEffect: card.hasUseEffect,
    isKeptOnUse: card.isKeptOnUse,
  }
}

export type EditCustomEffectsInput = {
  /** The Custom Card as the DM's dialog saw it. */
  card: CustomCard
  /** Its new effects, at least one, each with its text. */
  effects: readonly CustomCardEffect[]
  /** The signed-in DM. */
  by: string
}

/**
 * The DM's effect edit on a Custom Card (spec: custom-cards, "The DM edits a Custom Card's effects"; design D8): its
 * effects, its computed cost and its Held flags change, with a definition change record, in one transaction. A card
 * that changed since the dialog read it is `DefinitionChangedError`.
 */
export async function editCustomEffects(
  db: Firestore,
  input: EditCustomEffectsInput,
): Promise<void> {
  if (input.effects.length === 0) throw new CustomDraftError('invalid-choice')
  const cardDoc = doc(db, CARDS_COLLECTION, input.card.id)
  const recordDoc = doc(collection(db, DEFINITION_CHANGES_COLLECTION))
  const held = hasHeld(input.effects)
  const effects = input.effects.map(({ type, cost, text }) => ({ type, cost, text }))
  try {
    await runTransaction(db, async (transaction) => {
      const stored = (await transaction.get(cardDoc.withConverter(definitionConverter))).data()
      if (
        stored?.kind !== 'custom' ||
        stored.changeId !== input.card.changeId ||
        JSON.stringify(stored.effects) !== JSON.stringify(input.card.effects)
      ) {
        throw new DefinitionChangedError()
      }
      const changes = {
        effects,
        cost: `${cardCost(stored.base, effects).total}`,
        hasHeldEffect: held,
        isKeptOnUse: held,
      }
      const before = customSnapshotOf(stored)
      const after = customSnapshotOf({ ...stored, ...changes })
      transaction.update(cardDoc, { ...changes, changeId: recordDoc.id })
      transaction.set(recordDoc, {
        target: 'card',
        targetId: input.card.id,
        name: stored.name,
        step: 'edited',
        before,
        after,
        public: isPublicStep(before, after),
        by: input.by,
        at: serverTimestamp(),
      })
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

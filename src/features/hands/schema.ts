import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { CARD_LIMITS, DEFINITION_KINDS } from '@/features/cards/schema'
import { createConverter } from '@/lib/firestore/converter'

/**
 * How a card or True Word reached the hand: the DM's give (for a True Word, the DM's teaching), a transfer, a draw, a
 * pack's choice, or a True Word draft. Keep in step with `firestore.rules`.
 */
export const GIVEN_VIA = ['dm', 'transfer', 'draw', 'pack', 'draft'] as const
export type GivenVia = (typeof GIVEN_VIA)[number]

/** The ways of giving that name their draw, pack opening or draft in `drawId`. */
const NAMES_A_DRAW: readonly GivenVia[] = ['draw', 'pack', 'draft']

/** Why a card left the hand. Keep in step with `firestore.rules`. */
export const RETURN_REASONS = ['used', 'discarded', 'transferred'] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]

/** Field limits. Keep in step with `validNote`, `validCost` and `validUsedOn` in `firestore.rules`. */
export const HOLDING_LIMITS = {
  note: 1000,
  costOverride: 10,
  usedOn: 100,
} as const

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * One card's or True Word's stay with one player, at `userCards/{holdingId}` (design D5 of unify-cards-and-true-words).
 * A holding starts open (`returnedAt` is `null`) and is closed when the card leaves the hand, or when the DM takes the
 * word back. Holdings are never deleted, so the history is permanent.
 */
export const holdingSchema = z
  .object({
    /** The card's document ID. */
    cardId: id,
    /** The card's name when it was given, so the history reads well after a rename. */
    cardName: z.string().min(1).max(CARD_LIMITS.name),
    /** Copied from the definition; the rules check it against it. */
    cardKind: z.enum(DEFINITION_KINDS),
    /** The player who holds the card. */
    uid: id,
    givenAt: serverTime,
    /** The uid of the user who gave the card. */
    givenBy: id,
    givenVia: z.enum(GIVEN_VIA),
    /** For a transfer: the closed holding this one continues. */
    transferredFrom: id.nullable(),
    /**
     * For a drawn card, the draw that opened this holding; for a card chosen from a pack, the pack opening; for a
     * word learned from a draft, the draft.
     */
    drawId: id.nullable().default(null),
    active: z.boolean(),
    note: z.string().max(HOLDING_LIMITS.note),
    /** The cost in this hand, as written, replacing the card's own cost. `null` keeps the card's cost. */
    costOverride: z.string().min(1).max(HOLDING_LIMITS.costOverride).nullable(),
    /** `null` while the holding is open. */
    returnedAt: serverTime,
    returnedBy: id.nullable(),
    returnReason: z.enum(RETURN_REASONS).nullable(),
    /** For a used card: on which character it was used. */
    usedOn: z.string().min(1).max(HOLDING_LIMITS.usedOn).nullable(),
    /** For a transferred card: the receiver's new holding. */
    transferredTo: id.nullable(),
    /**
     * For a used card: the LP paid for the use, 0 when it was free. Written only when the holding closes as used;
     * holdings closed before payments, and open ones, read as `null`.
     */
    useCost: z.number().int().min(0).nullable().default(null),
    /** For a use that paid more than 0: the ledger entry of the payment. */
    useEntryId: id.nullable().default(null),
    /**
     * For a use on a stored character: that character (design D7 of add-characters), whose name at the time `usedOn`
     * keeps. Written only when the holding closes as used; a typed name, every other holding, and holdings closed
     * before characters read as `null`.
     */
    usedOnCharacterId: id.nullable().default(null),
  })
  .superRefine((holding, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    if ((holding.givenVia === 'transfer') !== (holding.transferredFrom !== null)) {
      issue('transferredFrom', 'only a transfer continues another holding, and it always does')
    }
    if (NAMES_A_DRAW.includes(holding.givenVia) !== (holding.drawId !== null)) {
      issue('drawId', 'only a drawn or pack holding names its draw, and it always does')
    }
    if ((holding.returnReason === null) !== (holding.returnedBy === null)) {
      issue('returnReason', 'a closed holding has both a reason and the user who closed it')
    }
    if (holding.usedOn !== null && holding.returnReason !== 'used') {
      issue('usedOn', 'only a holding closed as used names a character')
    }
    if (holding.usedOnCharacterId !== null && holding.usedOn === null) {
      issue('usedOnCharacterId', 'a use on a character also keeps its name')
    }
    if (holding.useCost !== null && holding.returnReason !== 'used') {
      issue('useCost', 'only a holding closed as used records a payment')
    }
    if ((holding.useEntryId !== null) !== (holding.useCost !== null && holding.useCost > 0)) {
      issue(
        'useEntryId',
        'a use that paid more than 0 names its ledger entry, and only such a use does',
      )
    }
    if ((holding.returnReason === 'transferred') !== (holding.transferredTo !== null)) {
      issue(
        'transferredTo',
        'only a holding closed as transferred names the new holding, and it always does',
      )
    }
  })

export type StoredHolding = z.infer<typeof holdingSchema>

/** The fields a new holding is created with: the payment and character fields come only with its close as used. */
export type NewHolding = Omit<StoredHolding, 'useCost' | 'useEntryId' | 'usedOnCharacterId'>

/** A holding as features see it: the stored fields plus the document ID as `id`. */
export type Holding = StoredHolding & { id: string }

export const holdingConverter = createConverter(holdingSchema, { idField: 'id' })

/** The most LP one kept use may take. Keep in step with `firestore.rules`. */
export const KEPT_USE_COST_MAX = 1_000_000

/**
 * One use of a card or True Word kept on use, at `uses/{useId}` (design D5 of unify-cards-and-true-words): its holding
 * stays open, so each use is its own record, created once with its payment and never changed or deleted.
 */
export const keptUseSchema = z
  .object({
    /** The player whose hand holds it. */
    uid: id,
    cardId: id,
    /** The definition's name when it was used, so the history reads well after a rename. */
    cardName: z.string().min(1).max(CARD_LIMITS.name),
    cardKind: z.enum(DEFINITION_KINDS),
    /** The player's open holding of it (`userCards/{holdingId}`). */
    holdingId: id,
    /** Who used it: the player, or the DM. */
    by: id,
    at: serverTime,
    /** The LP paid; 0 when free. */
    cost: z.number().int().min(0).max(KEPT_USE_COST_MAX),
    /** The payment's ledger entry; `null` when free. */
    entryId: id.nullable(),
    /** On which character it was used, as its name was then; written only for a use on a character. */
    usedOn: z.string().min(1).max(HOLDING_LIMITS.usedOn).nullable().default(null),
    /** The stored character, when it was chosen from the list rather than typed. */
    usedOnCharacterId: id.nullable().default(null),
  })
  .superRefine((use, context) => {
    if (use.usedOnCharacterId !== null && use.usedOn === null) {
      context.addIssue({
        code: 'custom',
        path: ['usedOnCharacterId'],
        message: 'a use on a character also keeps its name',
      })
    }
    if (use.cost > 0 !== (use.entryId !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['entryId'],
        message: 'a paid use names its entry, and a free one does not',
      })
    }
  })

export type StoredKeptUse = z.infer<typeof keptUseSchema>

/** A new kept use as written: the character fields come only with a use on a character. */
export type NewKeptUse = Omit<StoredKeptUse, 'usedOn' | 'usedOnCharacterId'> &
  Partial<Pick<StoredKeptUse, 'usedOn' | 'usedOnCharacterId'>>

export type KeptUse = StoredKeptUse & { id: string }
export const keptUseConverter = createConverter(keptUseSchema, { idField: 'id' })

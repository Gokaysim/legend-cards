import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { CARD_KINDS, CARD_LIMITS } from '@/features/cards/schema'
import { createConverter } from '@/lib/firestore/converter'

/** How a card reached the hand. Keep in step with `firestore.rules`. */
export const GIVEN_VIA = ['dm', 'transfer', 'draw', 'pack'] as const
export type GivenVia = (typeof GIVEN_VIA)[number]

/** The ways of giving that name their draw or pack opening in `drawId`. */
const NAMES_A_DRAW: readonly GivenVia[] = ['draw', 'pack']

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
 * One card's stay with one player, at `userCards/{holdingId}`. A holding starts open (`returnedAt` is `null`)
 * and is closed when the card leaves the hand. Holdings are never deleted, so the history is permanent.
 */
export const holdingSchema = z
  .object({
    /** The card's document ID. */
    cardId: id,
    /** The card's name when it was given, so the history reads well after a rename. */
    cardName: z.string().min(1).max(CARD_LIMITS.name),
    /** Copied from the card; the rules check it against the card. */
    cardKind: z.enum(CARD_KINDS),
    /** The player who holds the card. */
    uid: id,
    givenAt: serverTime,
    /** The uid of the user who gave the card. */
    givenBy: id,
    givenVia: z.enum(GIVEN_VIA),
    /** For a transfer: the closed holding this one continues. */
    transferredFrom: id.nullable(),
    /**
     * For a drawn card, the draw that opened this holding; for a card chosen from a pack, the pack opening. Stored
     * holdings from before draws read as `null`.
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
    if ((holding.returnReason === 'transferred') !== (holding.transferredTo !== null)) {
      issue(
        'transferredTo',
        'only a holding closed as transferred names the new holding, and it always does',
      )
    }
  })

export type StoredHolding = z.infer<typeof holdingSchema>

/** A holding as features see it: the stored fields plus the document ID as `id`. */
export type Holding = StoredHolding & { id: string }

export const holdingConverter = createConverter(holdingSchema, { idField: 'id' })

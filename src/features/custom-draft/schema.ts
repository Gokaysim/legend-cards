import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

import { BASE_PICKS, type DraftPick, type DraftProgress, OPTIONS_PER_STEP } from './draftRules'
import { CUSTOM_COSTS, EFFECT_TYPES } from './effectTypes'

/** The most a DM can charge for a draft. Keep in step with `firestore.rules`. */
export const CUSTOM_DRAFT_COST_MAX = 1_000_000

export const CUSTOM_DRAFT_STATUSES = ['open', 'finished', 'cancelled'] as const
export type CustomDraftStatus = (typeof CUSTOM_DRAFT_STATUSES)[number]

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()
const cost = z.union(CUSTOM_COSTS.map((value) => z.literal(value)))
const type = z.enum(EFFECT_TYPES)

/**
 * One Custom Card draft, at `draws/{drawId}` with `kind: 'customDraft'` (design D3 of add-custom-card-draft). It is
 * saved open when it starts, paid at once, and ends when its last pick makes the card, or when the DM cancels it with a
 * refund. An ended draft never changes. The picks are stored as two parallel lists for the rules; `picksOf` zips them.
 */
export const customDraftSchema = z
  .object({
    kind: z.literal('customDraft'),
    /** The user the draft is for. */
    uid: id,
    /** Who started it: the user, or the DM. */
    by: id,
    at: serverTime,
    /** The draft's cost: the card's draft cost, and the player's price in LP. */
    base: cost,
    paidWith: z.enum(['lp', 'none']),
    /** The LP paid; 0 when free. */
    cost: z.number().int().min(0).max(CUSTOM_DRAFT_COST_MAX),
    /** The payment's ledger entry; `null` when free. */
    entryId: id.nullable(),
    pickTypes: z.array(type),
    pickCosts: z.array(cost),
    /** The current step's options, in the order shown; empty when none is left or the draft ended. */
    offered: z.array(type).max(OPTIONS_PER_STEP),
    /** The current step's cost. */
    offerCost: cost,
    /** How many picks the card needs. */
    required: z.number().int().min(BASE_PICKS),
    /** Extra 1-cost picks still due from a 3-cost Special. */
    bonusLeft: z.number().int().min(0),
    status: z.enum(CUSTOM_DRAFT_STATUSES),
    closedAt: serverTime,
    /** Who made the last pick, or the DM who cancelled. */
    closedBy: id.nullable(),
    /** The card the draft made, and its holding. */
    cardId: id.nullable(),
    holdingId: id.nullable(),
    /** The refund's ledger entry, for a cancelled paid draft. */
    refundEntryId: id.nullable(),
  })
  .superRefine((draft, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    const paid = draft.paidWith === 'lp'
    if (paid !== draft.cost > 0 || paid !== (draft.entryId !== null)) {
      issue(
        'paidWith',
        'a paid draft costs more than 0 and names its entry, and a free one neither',
      )
    }
    if (draft.pickTypes.length !== draft.pickCosts.length) {
      issue('pickCosts', 'each pick has a type and a cost')
    }
    if ((draft.status === 'open') !== (draft.closedBy === null)) {
      issue('closedBy', 'an ended draft names who ended it, and an open one does not')
    }
    if ((draft.status === 'finished') !== (draft.cardId !== null && draft.holdingId !== null)) {
      issue('cardId', 'a finished draft names its card and holding, and no other does')
    }
    if ((draft.status === 'cancelled' && paid) !== (draft.refundEntryId !== null)) {
      issue('refundEntryId', 'a cancelled paid draft names its refund, and no other draft does')
    }
  })

export type StoredCustomDraft = z.infer<typeof customDraftSchema>
export type CustomDraft = StoredCustomDraft & { id: string }
export const customDraftConverter = createConverter(customDraftSchema, { idField: 'id' })

/** The draft's picks, its two stored lists zipped. */
export function picksOf(draft: Pick<StoredCustomDraft, 'pickTypes' | 'pickCosts'>): DraftPick[] {
  return draft.pickTypes.map((pickType, index) => ({
    type: pickType,
    cost: draft.pickCosts[index] ?? 1,
  }))
}

/** Where a stored draft stands, for the draft rules. */
export function progressOf(draft: StoredCustomDraft): DraftProgress {
  return {
    base: draft.base,
    picks: picksOf(draft),
    required: draft.required,
    bonusLeft: draft.bonusLeft,
    offerCost: draft.offerCost,
  }
}

/** A user's open Custom Card draft, at `playerCustomDrafts/{uid}`. A missing document means none. */
export const playerCustomDraftSchema = z.object({ openDraftId: id.nullable() })
export type PlayerCustomDraft = z.infer<typeof playerCustomDraftSchema>
export const playerCustomDraftConverter = createConverter(playerCustomDraftSchema)

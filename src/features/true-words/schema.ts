import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { CARD_LIMITS } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import { createConverter } from '@/lib/firestore/converter'

// The True Word definition is a card definition of the kind `trueWord` (design D1 of unify-cards-and-true-words).
export {
  isWordComplete,
  type MissingWordField,
  missingWordFields,
  type TrueWord,
  type WordCompletenessFields,
} from '@/features/cards/schema'

/** Field limits: the same as a card's (design D1 of unify-cards-and-true-words). */
export const TRUE_WORD_LIMITS = {
  name: CARD_LIMITS.name,
  cost: CARD_LIMITS.cost,
  text: CARD_LIMITS.text,
} as const

/** How many words a draft shows. Keep in step with `firestore.rules`. */
export const WORD_DRAFT_SIZE = 3

/** The most a DM can charge for a draft. Keep in step with `firestore.rules`. */
export const DRAFT_COST_MAX = 1_000_000

/** A draft's price in LP: 1 plus the number of True Words the player knows (spec: true-words, "Draft price"). */
export function draftPrice(knownCount: number): number {
  return 1 + knownCount
}

/** How a player came to know a word. Keep in step with `firestore.rules`. */
export const LEARNED_VIA = ['draft', 'dm'] as const
export type LearnedVia = (typeof LEARNED_VIA)[number]

export const DRAFT_STATUSES = ['open', 'learned', 'skipped', 'cancelled'] as const
export type DraftStatus = (typeof DRAFT_STATUSES)[number]

/** A draft is paid in LP or not at all; never in GP. */
export const DRAFT_PAYMENTS = ['lp', 'none'] as const
export type DraftPayment = (typeof DRAFT_PAYMENTS)[number]

const id = z.string().min(1)
const wordName = z.string().min(1).max(TRUE_WORD_LIMITS.name)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * A word a player knows, as the True Words screens see it (design D5 of unify-cards-and-true-words): a view of the
 * player's True Word holding at `userCards/{holdingId}`, given by a draft or by the DM. It is open while the player knows
 * the word, and closed when the DM takes it back; learning the word again opens a new holding.
 */
export type LearnedWord = {
  /** The holding's ID. */
  id: string
  wordId: string
  /** The word's name when it was learned, so the history reads well after a rename. */
  wordName: string
  /** The player who knows the word. */
  uid: string
  learnedAt: Timestamp | null
  /** The uid of who learned it from the draft (the player or the DM), or the DM who taught it. */
  learnedBy: string
  learnedVia: LearnedVia
  /** For a word learned from a draft: that draft. */
  draftId: string | null
  active: boolean
  /** The note on the word, written by the player or the DM, as on a held card. */
  note: string
  /** The DM's cost for the word in this hand, or `null` for its own cost. */
  costOverride: string | null
  /** When the DM took it back. `null` while known. */
  removedAt: Timestamp | null
  /** The DM who took it back; `null` while the player knows the word. */
  removedBy: string | null
}

/** A True Word holding as a known word. */
export function learnedWordOf(holding: Holding): LearnedWord {
  return {
    id: holding.id,
    wordId: holding.cardId,
    wordName: holding.cardName,
    uid: holding.uid,
    learnedAt: holding.givenAt,
    learnedBy: holding.givenBy,
    learnedVia: holding.givenVia === 'draft' ? 'draft' : 'dm',
    draftId: holding.givenVia === 'draft' ? holding.drawId : null,
    active: holding.active,
    note: holding.note,
    costOverride: holding.costOverride,
    removedAt: holding.returnedAt,
    removedBy: holding.returnedBy,
  }
}

/** True while the player knows the word: the DM has not taken it back. */
export function isKnown(record: LearnedWord): boolean {
  return record.removedBy === null
}

/**
 * A player's True Word state, at `playerWords/{uid}`: what the server checks without querying. `known` maps each
 * known word to its open holding, `openDraftId` is the player's open draft in `draws`, and `holdingId` is the holding
 * whose learning or take-back last changed `known`. A missing document is `EMPTY_PLAYER_WORDS`.
 */
export const playerWordsSchema = z.object({
  known: z.record(id, id),
  openDraftId: id.nullable(),
  holdingId: id.nullable(),
})

export type PlayerWords = z.infer<typeof playerWordsSchema>

/** A player with no `playerWords` document: knows nothing and has no open draft. */
export const EMPTY_PLAYER_WORDS: PlayerWords = { known: {}, openDraftId: null, holdingId: null }

export const playerWordsConverter = createConverter(playerWordsSchema)

/** The learned word of a draft, with the holding it opened. */
const learnedSchema = z.object({ cardId: id, cardName: wordName, holdingId: id })

/**
 * One True Word draft, at `draws/{drawId}` with `kind: 'wordDraft'` (design D5 of unify-cards-and-true-words). It is
 * saved open when it starts, paid at once, and ends when a word is learned, when it is skipped, or when the DM cancels
 * it with a refund. An ended draft never changes.
 */
export const wordDraftSchema = z
  .object({
    kind: z.literal('wordDraft'),
    /** The player the draft is for. */
    uid: id,
    /** Who started it: the player, or the DM. */
    by: id,
    /** When it started. */
    at: serverTime,
    /** The shown words' IDs, in the order shown. */
    offered: z.array(id).length(WORD_DRAFT_SIZE),
    status: z.enum(DRAFT_STATUSES),
    paidWith: z.enum(DRAFT_PAYMENTS),
    /** The LP paid; 0 when free. */
    cost: z.number().int().min(0).max(DRAFT_COST_MAX),
    /** The payment's ledger entry; `null` when free. */
    entryId: id.nullable(),
    /** When it ended. `null` while open, and in the local snapshot while the server time is pending. */
    closedAt: serverTime,
    /** Who learned, skipped or cancelled. `null` while open. */
    closedBy: id.nullable(),
    learned: learnedSchema.nullable(),
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
    if (new Set(draft.offered).size !== draft.offered.length) {
      issue('offered', 'a draft shows 3 distinct words')
    }
    const isOpen = draft.status === 'open'
    if (isOpen ? draft.closedAt !== null || draft.closedBy !== null : draft.closedBy === null) {
      issue('closedBy', 'an ended draft names who ended it, and an open one does not')
    }
    if ((draft.status === 'learned') !== (draft.learned !== null)) {
      issue('learned', 'a learned draft names its word, and no other does')
    }
    if (draft.learned !== null && !draft.offered.includes(draft.learned.cardId)) {
      issue('learned', 'the learned word is one of the shown words')
    }
    if ((draft.status === 'cancelled' && paid) !== (draft.refundEntryId !== null)) {
      issue('refundEntryId', 'a cancelled paid draft names its refund, and no other draft does')
    }
  })

export type StoredWordDraft = z.infer<typeof wordDraftSchema>
export type WordDraft = StoredWordDraft & { id: string }
export const wordDraftConverter = createConverter(wordDraftSchema, { idField: 'id' })

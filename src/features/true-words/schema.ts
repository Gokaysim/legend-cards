import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { picturePathSchema } from '@/features/definitions/picturePath'
import { DEFINITION_STATUSES } from '@/features/definitions/status'
import { USED_ON_MAX } from '@/features/characters/useTarget'
import { createConverter } from '@/lib/firestore/converter'

/** Field limits. Keep in step with `WORD_LIMITS` in `scripts/lib/trueWordRows.ts`. */
export const TRUE_WORD_LIMITS = {
  name: 200,
  cost: 10,
  text: 2000,
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

/** The definition fields whose emptiness decides whether a word is complete. */
export type WordCompletenessFields = { cost: string | null; text: string }

/** The fields a word requires and that are empty here. */
export type MissingWordField = 'cost' | 'text'

/**
 * The required fields this word leaves empty: a True Word needs a cost and a text (spec: definition-editing,
 * "Complete definitions"). Keep in step with `completeWord` in `firestore.rules` and `scripts/lib/trueWordRows.ts`.
 */
export function missingWordFields(word: WordCompletenessFields): MissingWordField[] {
  const missing: MissingWordField[] = []
  if (word.cost === null) missing.push('cost')
  if (word.text === '') missing.push('text')
  return missing
}

/** True when the word has a cost and a text, so it may be active or retired. */
export function isWordComplete(word: WordCompletenessFields): boolean {
  return missingWordFields(word).length === 0
}

/**
 * One True Word, at `trueWords/{wordId}`. The import script adds words, and the DM adds and changes them through the
 * definition steps (spec: definition-editing). A draft may lack its cost or text and only the DM reads it. A retired
 * word stays with the players who know it, but is never offered or taught again; neither is a draft.
 */
export const trueWordSchema = z
  .object({
    name: wordName,
    /** The normalized name the import and the DM's form match words by. It follows the name when it is renamed. */
    nameKey: z.string().min(1),
    /**
     * As written ("1", "0", "X"): the LP paid at the table each time the word is used. The app never charges it.
     * Null only in a draft.
     */
    cost: z.string().min(1).max(TRUE_WORD_LIMITS.cost).nullable(),
    text: z.string().max(TRUE_WORD_LIMITS.text),
    status: z.enum(DEFINITION_STATUSES),
    /** The change record of the newest definition step; words from before definition editing have none. */
    changeId: z.string().min(1).nullable().default(null),
    /** Where the word's picture is in Cloud Storage (`words/<id>/<hash>.webp`), or `null` for none, as for cards. */
    picture: picturePathSchema.nullable().default(null),
  })
  .superRefine((word, ctx) => {
    if (word.status === 'draft') return
    for (const field of missingWordFields(word)) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `An ${word.status} word needs ${field}`,
      })
    }
  })

export type StoredTrueWord = z.infer<typeof trueWordSchema>
export type TrueWord = StoredTrueWord & { id: string }
export const trueWordConverter = createConverter(trueWordSchema, { idField: 'id' })

/**
 * One word one player learned, at `userTrueWords/{recordId}`. It is open while the player knows the word, and
 * closed when the DM takes it back. Records are never deleted, and learning the word again makes a new record.
 */
export const learnedWordSchema = z
  .object({
    wordId: id,
    /** The word's name when it was learned, so the history reads well after a rename. */
    wordName,
    /** The player who knows the word. */
    uid: id,
    learnedAt: serverTime,
    /** The uid of who learned it from the draft (the player or the DM), or the DM who taught it. */
    learnedBy: id,
    learnedVia: z.enum(LEARNED_VIA),
    /** For a word learned from a draft: that draft. */
    draftId: id.nullable(),
    active: z.boolean(),
    /** When the DM took it back. `null` while known, and in the local snapshot while the server time is pending. */
    removedAt: serverTime,
    /** The DM who took it back; `null` while the player knows the word. */
    removedBy: id.nullable(),
  })
  .superRefine((record, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    if ((record.learnedVia === 'draft') !== (record.draftId !== null)) {
      issue('draftId', 'only a word learned from a draft names it, and it always does')
    }
    if (record.removedBy === null && record.removedAt !== null) {
      issue('removedBy', 'a taken-back record names who took it back')
    }
  })

export type StoredLearnedWord = z.infer<typeof learnedWordSchema>
export type LearnedWord = StoredLearnedWord & { id: string }
export const learnedWordConverter = createConverter(learnedWordSchema, { idField: 'id' })

/** True while the player knows the word: the DM has not taken it back. */
export function isKnown(record: LearnedWord): boolean {
  return record.removedBy === null
}

/**
 * A player's True Word state, at `playerWords/{uid}`: what the server checks without querying. `known` maps each
 * known word to its open record, `openDraftId` is the player's open draft, and `recordId` is the record whose
 * learning or take-back last changed `known`. A missing document is `EMPTY_PLAYER_WORDS`.
 */
export const playerWordsSchema = z.object({
  known: z.record(id, id),
  openDraftId: id.nullable(),
  recordId: id.nullable(),
})

export type PlayerWords = z.infer<typeof playerWordsSchema>

/** A player with no `playerWords` document: knows nothing and has no open draft. */
export const EMPTY_PLAYER_WORDS: PlayerWords = { known: {}, openDraftId: null, recordId: null }

export const playerWordsConverter = createConverter(playerWordsSchema)

/** The learned word of a draft, with the record it opened. */
const learnedSchema = z.object({ wordId: id, wordName, recordId: id })

/**
 * One True Word draft, at `wordDrafts/{draftId}`. It is saved open when it starts, paid at once, and ends when a
 * word is learned, when it is skipped, or when the DM cancels it with a refund. An ended draft never changes.
 */
export const wordDraftSchema = z
  .object({
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
    if (draft.learned !== null && !draft.offered.includes(draft.learned.wordId)) {
      issue('learned', 'the learned word is one of the shown words')
    }
    if ((draft.status === 'cancelled' && paid) !== (draft.refundEntryId !== null)) {
      issue('refundEntryId', 'a cancelled paid draft names its refund, and no other draft does')
    }
  })

export type StoredWordDraft = z.infer<typeof wordDraftSchema>
export type WordDraft = StoredWordDraft & { id: string }
export const wordDraftConverter = createConverter(wordDraftSchema, { idField: 'id' })

/** The most LP one word use may take. Keep in step with `firestore.rules`. */
export const WORD_USE_COST_MAX = 1_000_000

/**
 * One use of a known True Word, at `wordUses/{useId}` (design D2 of `pay-lp-on-use`). The word stays known, so a use
 * is its own record, created once with its payment and never changed or deleted.
 */
export const wordUseSchema = z
  .object({
    /** The player whose word it is. */
    uid: id,
    wordId: id,
    /** The word's name when it was used, so the history reads well after a rename. */
    wordName,
    /** The player's record of the word (`userTrueWords/{recordId}`), open when it was used. */
    recordId: id,
    /** Who used it: the player, or the DM. */
    by: id,
    at: serverTime,
    /** The LP paid; 0 when free. */
    cost: z.number().int().min(0).max(WORD_USE_COST_MAX),
    /** The payment's ledger entry; `null` when free. */
    entryId: id.nullable(),
    /**
     * On which character it was used, as its name was then (design D4 of add-character-effects). Written only when a
     * character was given; older uses read as `null`.
     */
    usedOn: z.string().min(1).max(USED_ON_MAX).nullable().default(null),
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

export type StoredWordUse = z.infer<typeof wordUseSchema>

/** A new word use as written: the character fields come only with a use on a character. */
export type NewWordUse = Omit<StoredWordUse, 'usedOn' | 'usedOnCharacterId'> &
  Partial<Pick<StoredWordUse, 'usedOn' | 'usedOnCharacterId'>>
export type WordUse = StoredWordUse & { id: string }
export const wordUseConverter = createConverter(wordUseSchema, { idField: 'id' })

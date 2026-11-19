import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { DRAW_RARITIES, type DrawFilters } from '@/features/cards/pool'
import { CARD_KINDS, CARD_LIMITS } from '@/features/cards/schema'
import { DEFAULT_DRAW_PRICE, DRAW_COST_MAX } from '@/features/table/playerDraw'
import { type WordDraft, wordDraftSchema } from '@/features/true-words/schema'
import { createConverter } from '@/lib/firestore/converter'

/** A random draw from the pool, or a draw from the Cursed Deck. Keep in step with `firestore.rules`. */
export const DRAW_KINDS = ['random', 'cursed'] as const
export type DrawKind = (typeof DRAW_KINDS)[number]

/** The pack types, in the order of docs/domain.md. Keep in step with `firestore.rules`. */
export const PACK_TYPES = [
  'standard',
  'premium',
  'cursed',
  'pandemonium',
  'pandemoniumCursed',
  'mechanic',
  'golden',
  'cursedGolden',
] as const
export type PackType = (typeof PACK_TYPES)[number]

/** The pack types that also show one Cursed card, which goes to the hand with the chosen card. */
export const CURSED_PACK_TYPES: readonly PackType[] = [
  'cursed',
  'pandemoniumCursed',
  'cursedGolden',
]

/** The pack types of one set: their record names the set in `setCode`. */
export const SET_PACK_TYPES: readonly PackType[] = [
  'standard',
  'premium',
  'cursed',
  'pandemonium',
  'pandemoniumCursed',
]

export function isCursedPackType(type: PackType): boolean {
  return CURSED_PACK_TYPES.includes(type)
}

/** How many cards a pack of this type shows: 5, and a sixth, Cursed, card for the Cursed types. */
export function packSize(type: PackType): number {
  return isCursedPackType(type) ? 6 : 5
}

/** How a pack was paid: the player's LP, the party's GP, or nothing. Keep in step with `firestore.rules`. */
export const PACK_PAYMENTS = ['lp', 'gp', 'none'] as const
export type PackPayment = (typeof PACK_PAYMENTS)[number]

/** Where a pack opening is: open (the table waits), or ended by a choice or the DM's cancel. */
export const PACK_STATUSES = ['open', 'chosen', 'cancelled'] as const
export type PackStatus = (typeof PACK_STATUSES)[number]

/** The largest amount a pack can cost. Keep in step with `firestore.rules` and the balance limit. */
export const PACK_COST_MAX = 1_000_000

/** How a draw was paid: from the hand owner's LP, or nothing (a free draw, and every Cursed draw). */
export const DRAW_PAYMENTS = ['lp', 'none'] as const
export type DrawPayment = (typeof DRAW_PAYMENTS)[number]

/**
 * The LP a player's random draw costs under "Kapalı", and the price a draw dialog starts at while the player draw mode
 * is on (spec: card-draws).
 */
export const DRAW_PRICE = DEFAULT_DRAW_PRICE

/** A draw's price: a whole number of LP from 0 (free) to the ledger's largest change. */
const drawCost = z.number().int().min(0).max(DRAW_COST_MAX)

/** The longest filter values. Keep in step with `validFilters` in `firestore.rules`. */
export const DRAW_LIMITS = {
  setCode: CARD_LIMITS.setCode,
  cost: CARD_LIMITS.cost,
  mechanicPack: CARD_LIMITS.mechanicPack,
  keyword: 100,
} as const

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()
const filterText = (max: number) => z.string().min(1).max(max).nullable()

/**
 * The filters of a random draw: the DM's, or a player's under the table's player draw mode (spec: card-draws). A record
 * from before the set filter has no `setCode`: it reads as no set.
 */
export const drawFiltersSchema: z.ZodType<DrawFilters> = z.object({
  setCode: filterText(DRAW_LIMITS.setCode).default(null),
  cost: filterText(DRAW_LIMITS.cost),
  mechanicPack: filterText(DRAW_LIMITS.mechanicPack),
  rarity: z.enum(DRAW_RARITIES).nullable(),
  keyword: filterText(DRAW_LIMITS.keyword),
})

/**
 * One card drawn into a hand, at `draws/{drawId}`: a random or a Cursed draw. It is created once, together with
 * the holding it opens, the drawn normal card's holder and, for a paid draw, the ledger entry and the new LP. It is
 * never changed or deleted.
 */
export const cardDrawSchema = z
  .object({
    kind: z.enum(DRAW_KINDS),
    /** Whose hand the card went to. */
    uid: id,
    /** Who drew: the hand's owner, or the DM. */
    by: id,
    at: serverTime,
    /** The drawn card, as its holding copies it. */
    cardId: id,
    cardName: z.string().min(1).max(CARD_LIMITS.name),
    cardKind: z.enum(CARD_KINDS),
    /** The holding the draw opened. */
    holdingId: id,
    /** The filters of a random draw, the DM's or a player's; `null` without filters. */
    filters: drawFiltersSchema.nullable(),
    paidWith: z.enum(DRAW_PAYMENTS),
    /** The LP paid from the hand owner's LP: above 0 with `lp`, 0 with `none` (design D2 of adjustable-draw-price). */
    cost: drawCost,
    /** The ledger entry of the payment; `null` when free. */
    entryId: id.nullable(),
    /** The draw session it belongs to (spec: live-draws). A record from before the sessions has none: `null`. */
    sessionId: id.nullable().default(null),
  })
  .superRefine((draw, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    if ((draw.kind === 'cursed') !== (draw.cardKind === 'cursed')) {
      issue(
        'cardKind',
        'a random draw gives a normal or Blessed card, and a Cursed draw a Cursed one',
      )
    }
    const paid = draw.paidWith === 'lp'
    if (paid !== draw.cost > 0 || paid !== (draw.entryId !== null)) {
      issue('paidWith', 'a paid draw costs more than 0 and names its entry, and a free one neither')
    }
    if (draw.kind === 'cursed' && (paid || draw.filters !== null)) {
      issue('kind', 'a Cursed draw is free and has no filters')
    }
  })

const packCard = {
  cardId: id,
  cardName: z.string().min(1).max(CARD_LIMITS.name),
  holdingId: id,
}

/**
 * One pack opened into a hand, at `draws/{drawId}`. It is created open, together with the table's lock and, when
 * paid, the ledger entry and the new balance. While it is open, only its turned cards change. It ends once, chosen
 * from or cancelled by the DM, and then never changes again.
 */
export const packOpeningSchema = z
  .object({
    kind: z.literal('pack'),
    /** The hand the pack is for. */
    uid: id,
    /** Who opened it: the hand's owner, or the DM. */
    by: id,
    /** When it was opened. */
    at: serverTime,
    packType: z.enum(PACK_TYPES),
    /** The set, for the pack types of one set. */
    setCode: z.string().min(1).max(CARD_LIMITS.setCode).nullable(),
    /** The mechanic pack, for a Mechanic Pack. */
    mechanicPack: z.string().min(1).max(CARD_LIMITS.mechanicPack).nullable(),
    /** The shown cards' IDs, in the order shown. */
    offered: z.array(id).min(5).max(6),
    /** The positions in `offered` turned face up, in turning order. */
    revealed: z.array(z.number().int().min(0).max(5)),
    paidWith: z.enum(PACK_PAYMENTS),
    /** The amount paid, in the currency of `paidWith`; 0 when free. */
    cost: z.number().int().min(0).max(PACK_COST_MAX),
    /** The payment's ledger entry; `null` when free. */
    entryId: id.nullable(),
    status: z.enum(PACK_STATUSES),
    /** When it ended. `null` while open, and in the local snapshot while the server time is pending. */
    closedAt: serverTime,
    /** Who chose or cancelled. `null` while open. */
    closedBy: id.nullable(),
    /** The chosen card, a normal or Blessed one, and its holding. */
    chosen: z.object({ ...packCard, cardKind: z.enum(['normal', 'blessed']) }).nullable(),
    /** The mandatory Cursed card of a Cursed type, and its holding. */
    cursed: z.object(packCard).nullable(),
    /** The refund's ledger entry, for a cancelled paid pack. */
    refundEntryId: id.nullable(),
  })
  .superRefine((pack, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    const paid = pack.paidWith !== 'none'
    if (paid !== pack.cost > 0 || paid !== (pack.entryId !== null)) {
      issue('paidWith', 'a paid pack costs more than 0 and names its entry, and a free one neither')
    }
    const isSetPack = SET_PACK_TYPES.includes(pack.packType)
    if (isSetPack !== (pack.setCode !== null)) {
      issue('setCode', 'only the pack types of one set name a set, and they always do')
    }
    if ((pack.packType === 'mechanic') !== (pack.mechanicPack !== null)) {
      issue('mechanicPack', 'only a Mechanic Pack names a mechanic pack, and it always does')
    }
    if (
      pack.offered.length !== packSize(pack.packType) ||
      new Set(pack.offered).size !== pack.offered.length
    ) {
      issue('offered', 'a pack shows 5 distinct cards, and 6 for a Cursed type')
    }
    const isTurned = (index: number) => index < pack.offered.length
    if (new Set(pack.revealed).size !== pack.revealed.length || !pack.revealed.every(isTurned)) {
      issue('revealed', 'each turned position is a shown card, turned once')
    }
    const isOpen = pack.status === 'open'
    if (isOpen ? pack.closedAt !== null || pack.closedBy !== null : pack.closedBy === null) {
      issue('closedBy', 'an ended pack names who ended it, and an open one does not')
    }
    const isChosen = pack.status === 'chosen'
    if (isChosen !== (pack.chosen !== null)) {
      issue('chosen', 'a chosen pack names its card, and no other does')
    }
    if (isChosen && pack.revealed.length !== pack.offered.length) {
      issue('revealed', 'a pack is chosen from only after every card is turned')
    }
    if ((isChosen && isCursedPackType(pack.packType)) !== (pack.cursed !== null)) {
      issue('cursed', "a Cursed type's choice names its Cursed card, and no other pack does")
    }
    if (pack.chosen !== null && !pack.offered.includes(pack.chosen.cardId)) {
      issue('chosen', 'the chosen card is one of the shown cards')
    }
    if (
      pack.cursed !== null &&
      (!pack.offered.includes(pack.cursed.cardId) || pack.cursed.cardId === pack.chosen?.cardId)
    ) {
      issue('cursed', 'the Cursed card is another of the shown cards')
    }
    if ((pack.status === 'cancelled' && paid) !== (pack.refundEntryId !== null)) {
      issue('refundEntryId', 'a cancelled paid pack names its refund, and no other pack does')
    }
  })

/**
 * Every record at `draws/{drawId}`: a card draw, a pack opening, or a True Word draft (design D5 of
 * unify-cards-and-true-words).
 */
export const drawSchema = z.discriminatedUnion('kind', [
  cardDrawSchema,
  packOpeningSchema,
  wordDraftSchema,
])

export type StoredCardDraw = z.infer<typeof cardDrawSchema>
export type StoredPackOpening = z.infer<typeof packOpeningSchema>
export type StoredDraw = z.infer<typeof drawSchema>

/** A random or Cursed draw as features see it: the stored fields plus the document ID as `id`. */
export type CardDraw = StoredCardDraw & { id: string }

/** A pack opening as features see it: the stored fields plus the document ID as `id`. */
export type PackOpening = StoredPackOpening & { id: string }

/** Any record of the draws collection, with its document ID as `id`. */
export type Draw = CardDraw | PackOpening | WordDraft

export function isPackOpening(draw: Draw): draw is PackOpening {
  return draw.kind === 'pack'
}

export function isCardDraw(draw: Draw): draw is CardDraw {
  return draw.kind === 'random' || draw.kind === 'cursed'
}

export function isWordDraft(draw: Draw): draw is WordDraft {
  return draw.kind === 'wordDraft'
}

export const drawConverter = createConverter(drawSchema, { idField: 'id' })

/** Pack openings only: for reading one pack by its ID. */
export const packOpeningConverter = createConverter(packOpeningSchema, { idField: 'id' })

/** The most draws one session keeps. Keep in step with `firestore.rules`. */
export const DRAW_SESSION_MAX = 500

/**
 * One draw of a session: the draw record, its card, the set whose cardback it had (`null`: no set filter), and its
 * price. A card stored before the prices has none: `null` (design D4 of adjustable-draw-price).
 */
const sessionDrawSchema = z.object({
  drawId: id,
  cardId: id,
  backSet: z.string().min(1).max(CARD_LIMITS.setCode).nullable(),
  cost: drawCost.nullable().default(null),
})

/**
 * One opening of the draw dialog that drew at least one card, at `drawSessions/{sessionId}` (spec: live-draws, design
 * D1). It is created with its first draw, and each later draw of the dialog joins it in the draw's own step. The hand's
 * owner and the DM turn its cards and end it. It is never deleted.
 */
export const drawSessionSchema = z
  .object({
    kind: z.enum(DRAW_KINDS),
    /** Whose hand the cards go to. */
    uid: id,
    /** Who draws: the hand's owner, or the DM. */
    by: id,
    startedAt: serverTime,
    /** The time of the last draw, turn or end: a session idle for 10 minutes counts as ended. */
    lastAt: serverTime,
    /** The session's draws, in the order drawn. */
    draws: z.array(sessionDrawSchema).min(1).max(DRAW_SESSION_MAX),
    /** The positions in `draws` turned face up, each at most once. */
    turned: z.array(z.number().int().min(0)),
    /** When it ended. `null` while open, and in the local snapshot while the server time is pending. */
    endedAt: serverTime,
    /** Who ended it. `null` while open. */
    endedBy: id.nullable(),
  })
  .superRefine((session, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    const isDrawn = (index: number) => index < session.draws.length
    if (new Set(session.turned).size !== session.turned.length || !session.turned.every(isDrawn)) {
      issue('turned', 'each turned position is a drawn card, turned once')
    }
    if (session.endedAt !== null && session.endedBy === null) {
      issue('endedBy', 'an ended session names who ended it')
    }
    if (session.kind === 'cursed' && session.draws.some((draw) => draw.backSet !== null)) {
      issue('draws', 'a Cursed draw has no set filter')
    }
  })

export type StoredDrawSession = z.infer<typeof drawSessionSchema>

/** A draw session as features see it: the stored fields plus the document ID as `id`. */
export type DrawSession = StoredDrawSession & { id: string }

export const drawSessionConverter = createConverter(drawSessionSchema, { idField: 'id' })

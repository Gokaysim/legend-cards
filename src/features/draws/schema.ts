import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { DRAW_RARITIES, type DrawFilters } from '@/features/cards/pool'
import { CARD_KINDS, CARD_LIMITS } from '@/features/cards/schema'
import { createConverter } from '@/lib/firestore/converter'

/** A random draw from the pool, or a draw from the Cursed Deck. The Pack Shop adds `pack`. Keep in step with `firestore.rules`. */
export const DRAW_KINDS = ['random', 'cursed'] as const
export type DrawKind = (typeof DRAW_KINDS)[number]

/** How a draw was paid: a player's 1 LP, or nothing (the DM's draws and Cursed draws). */
export const DRAW_PAYMENTS = ['lp', 'none'] as const
export type DrawPayment = (typeof DRAW_PAYMENTS)[number]

/** The LP a player pays for one random draw. */
export const DRAW_PRICE = 1

/** The longest filter values. Keep in step with `validFilters` in `firestore.rules`. */
export const DRAW_LIMITS = {
  cost: CARD_LIMITS.cost,
  mechanicPack: CARD_LIMITS.mechanicPack,
  keyword: 100,
} as const

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()
const filterText = (max: number) => z.string().min(1).max(max).nullable()

export const drawFiltersSchema: z.ZodType<DrawFilters> = z.object({
  cost: filterText(DRAW_LIMITS.cost),
  mechanicPack: filterText(DRAW_LIMITS.mechanicPack),
  rarity: z.enum(DRAW_RARITIES).nullable(),
  keyword: filterText(DRAW_LIMITS.keyword),
})

/**
 * One card drawn into a hand, at `draws/{drawId}`. It is created once, together with the holding it opens, the
 * drawn normal card's holder and, for a paid draw, the ledger entry and the new LP. Draws are never changed or
 * deleted.
 */
export const drawSchema = z
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
    /** The DM's filters for a random draw; `null` without filters. */
    filters: drawFiltersSchema.nullable(),
    paidWith: z.enum(DRAW_PAYMENTS),
    /** The LP paid: 1 with `lp`, 0 with `none`. */
    cost: z.union([z.literal(0), z.literal(DRAW_PRICE)]),
    /** The ledger entry of the payment; `null` when free. */
    entryId: id.nullable(),
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
    if (paid !== (draw.cost === DRAW_PRICE) || paid !== (draw.entryId !== null)) {
      issue('paidWith', 'a paid draw costs 1 LP and names its entry, and a free one neither')
    }
    if (draw.kind === 'cursed' && (paid || draw.filters !== null)) {
      issue('kind', 'a Cursed draw is free and has no filters')
    }
    if (paid && draw.filters !== null) {
      issue('filters', "only the DM's free draws have filters")
    }
  })

export type StoredDraw = z.infer<typeof drawSchema>

/** A draw as features see it: the stored fields plus the document ID as `id`. */
export type Draw = StoredDraw & { id: string }

export const drawConverter = createConverter(drawSchema, { idField: 'id' })

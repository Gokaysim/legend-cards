import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/** The kinds of card. Keep in step with `scripts/lib/cardRows.ts`. */
export const CARD_KINDS = ['normal', 'blessed', 'cursed'] as const
export type CardKind = (typeof CARD_KINDS)[number]

export const RARITIES = ['common', 'rare'] as const
export type Rarity = (typeof RARITIES)[number]

/** Field limits. Keep in step with `LIMITS` in `scripts/lib/cardRows.ts`. */
export const CARD_LIMITS = {
  name: 200,
  setCode: 100,
  cost: 10,
  mechanicPack: 100,
  text: 2000,
} as const

const name = z.string().min(1).max(CARD_LIMITS.name)

/**
 * Who holds a normal card: the user and their open holding (`userCards/{userCardId}`). `null` means the card is
 * in the pool. Stored cards from before card holdings have no field, which reads as `null`.
 */
export const cardHolderSchema = z.object({
  uid: z.string().min(1),
  userCardId: z.string().min(1),
})
export type CardHolder = z.infer<typeof cardHolderSchema>
const setCode = z.string().min(1).max(CARD_LIMITS.setCode)
const mechanicPack = z.string().min(1).max(CARD_LIMITS.mechanicPack)

/** Fields every kind has. */
const common = {
  name,
  /** The normalized name the import matches cards by. */
  nameKey: z.string().min(1),
  /** As written ("1", "X", "d6"); null when the card has no cost. */
  cost: z.string().min(1).max(CARD_LIMITS.cost).nullable(),
  /** Raw text, including the hidden `[bracket]` metadata. Show it through `visibleText`. */
  text: z.string().max(CARD_LIMITS.text),
  /** Retired cards are kept for history but shown nowhere. */
  retired: z.boolean(),
}

const normalCardSchema = z.object({
  kind: z.literal('normal'),
  ...common,
  setCode,
  rarity: z.enum(RARITIES),
  mechanicPack: mechanicPack.nullable(),
  holder: cardHolderSchema.nullable().default(null),
})

/** "Blessed" is a marker, not a set: Blessed cards have no set code and no rarity. */
const blessedCardSchema = z.object({
  kind: z.literal('blessed'),
  ...common,
  setCode: z.null(),
  rarity: z.null(),
  mechanicPack: mechanicPack.nullable(),
  /** Blessed cards are repeatable: they never have a holder. */
  holder: z.null().default(null),
})

/** Cursed cards form one global deck: no set code, rarity, or mechanic pack. */
const cursedCardSchema = z.object({
  kind: z.literal('cursed'),
  ...common,
  setCode: z.null(),
  rarity: z.null(),
  mechanicPack: z.null(),
  /** Cursed cards are repeatable: they never have a holder. */
  holder: z.null().default(null),
})

/**
 * A card definition at `cards/{cardId}`. Only the import script writes the definition; the application changes
 * only a normal card's `holder`, under the card-holdings rules. Fields added later (`holder`, `imageUrl`) have
 * defaults, so stored cards need no migration.
 */
export const cardSchema = z.discriminatedUnion('kind', [
  normalCardSchema,
  blessedCardSchema,
  cursedCardSchema,
])

export const cardConverter = createConverter(cardSchema, { idField: 'id' })

/** A card as features see it: the stored fields plus the document ID as `id`. */
export type Card = z.infer<typeof cardSchema> & { id: string }
export type NormalCard = Extract<Card, { kind: 'normal' }>
export type CursedCard = Extract<Card, { kind: 'cursed' }>

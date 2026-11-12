import { z } from 'zod'

import { picturePathSchema } from '@/features/definitions/picturePath'
import { DEFINITION_STATUSES } from '@/features/definitions/status'
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
  /** The normalized name the import and the DM's form match cards by. It follows the name when it is renamed. */
  nameKey: z.string().min(1),
  /** As written ("1", "X", "d6"); null when the card has no cost. A cost is never required. */
  cost: z.string().min(1).max(CARD_LIMITS.cost).nullable(),
  /** Raw text, including the hidden `[bracket]` metadata. Show it through `visibleText`. Empty only in a draft. */
  text: z.string().max(CARD_LIMITS.text),
  /** Draft, active or retired (spec: definition-editing). Only the DM's device ever receives a draft. */
  status: z.enum(DEFINITION_STATUSES),
  /**
   * The change record of the newest definition step (`definitionChanges/{changeId}`), as a balance points at its
   * ledger entry. Cards from before definition editing have none.
   */
  changeId: z.string().min(1).nullable().default(null),
  /**
   * Where the card's picture is in Cloud Storage (`cards/<id>/<hash>.webp`), or `null` for none. A stored card may
   * lack the field (it never had a picture) or hold `null` (the DM removed it): both read as `null` here, and the
   * difference matters only to the picture import (design D3 of upload-card-and-word-pictures).
   */
  picture: picturePathSchema.nullable().default(null),
}

/** A normal card's set, rarity and mechanic pack may be empty only in a draft (see `isComplete`). */
const normalCardSchema = z.object({
  kind: z.literal('normal'),
  ...common,
  setCode: setCode.nullable(),
  rarity: z.enum(RARITIES).nullable(),
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

/** The definition fields whose emptiness decides whether a card is complete. */
export type CardCompletenessFields = {
  kind: CardKind
  setCode: string | null
  rarity: Rarity | null
  mechanicPack: string | null
  text: string
}

/** The fields a card's kind requires and that are empty here. */
export type MissingCardField = 'setCode' | 'rarity' | 'mechanicPack' | 'text'

/**
 * The required fields this card leaves empty (spec: definition-editing, "Complete definitions"): a normal card needs a
 * set, a rarity, a mechanic pack and a text; a Blessed card a mechanic pack and a text; a Cursed card a text. A cost
 * is never required. Keep in step with `completeCard` in `firestore.rules` and the rows in `scripts/lib/cardRows.ts`.
 */
export function missingCardFields(card: CardCompletenessFields): MissingCardField[] {
  const missing: MissingCardField[] = []
  if (card.kind === 'normal') {
    if (card.setCode === null) missing.push('setCode')
    if (card.rarity === null) missing.push('rarity')
  }
  if (card.kind !== 'cursed' && card.mechanicPack === null) missing.push('mechanicPack')
  if (card.text === '') missing.push('text')
  return missing
}

/** True when the card has every field its kind requires, so it may be active or retired. */
export function isComplete(card: CardCompletenessFields): boolean {
  return missingCardFields(card).length === 0
}

/**
 * A card definition at `cards/{cardId}`. The import script adds cards; the DM adds and changes them through the
 * definition steps (spec: definition-editing); a normal card's `holder` changes under the card-holdings rules. An
 * active or retired card is always complete. Fields added later (`holder`, `changeId`) have defaults.
 */
export const cardSchema = z
  .discriminatedUnion('kind', [normalCardSchema, blessedCardSchema, cursedCardSchema])
  .superRefine((card, ctx) => {
    if (card.status === 'draft') return
    for (const field of missingCardFields(card)) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `An ${card.status} card needs ${field}`,
      })
    }
  })

export const cardConverter = createConverter(cardSchema, { idField: 'id' })

/** A card as features see it: the stored fields plus the document ID as `id`. */
export type Card = z.infer<typeof cardSchema> & { id: string }
export type NormalCard = Extract<Card, { kind: 'normal' }>
export type CursedCard = Extract<Card, { kind: 'cursed' }>

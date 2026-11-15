import { z } from 'zod'

import { type BehaviorFlag, type DefinitionKind, startingFlags } from '@/features/definitions/flags'
import { picturePathSchema } from '@/features/definitions/picturePath'
import { DEFINITION_STATUSES } from '@/features/definitions/status'
import { createConverter } from '@/lib/firestore/converter'

export {
  BEHAVIOR_FLAGS,
  type BehaviorFlag,
  type BehaviorFlags,
  DEFINITION_KINDS,
  type DefinitionKind,
} from '@/features/definitions/flags'

/** The kinds of card: every definition kind but the True Word. Keep in step with `scripts/lib/cardRows.ts`. */
export const CARD_KINDS = ['normal', 'blessed', 'cursed'] as const
export type CardKind = (typeof CARD_KINDS)[number]

export const RARITIES = ['common', 'rare'] as const
export type Rarity = (typeof RARITIES)[number]

/**
 * Field limits, the same for cards and True Words. Keep in step with `LIMITS` in `scripts/lib/cardRows.ts` and
 * `WORD_LIMITS` in `scripts/lib/trueWordRows.ts`.
 */
export const CARD_LIMITS = {
  name: 200,
  setCode: 100,
  cost: 10,
  mechanicPack: 100,
  text: 2000,
} as const

const name = z.string().min(1).max(CARD_LIMITS.name)

/**
 * Who holds a card with one copy: the user and their open holding (`userCards/{userCardId}`). `null` means the card
 * is in the pool. A card without the field has no holder.
 */
export const cardHolderSchema = z.object({
  uid: z.string().min(1),
  userCardId: z.string().min(1),
})
export type CardHolder = z.infer<typeof cardHolderSchema>
const setCode = z.string().min(1).max(CARD_LIMITS.setCode)
const mechanicPack = z.string().min(1).max(CARD_LIMITS.mechanicPack)
const holder = cardHolderSchema.nullable().default(null)

/**
 * The eight behavior flags (spec: definition-editing, "Behavior flags"; design D2 of unify-cards-and-true-words).
 * Every definition stores all of them; the values a kind fixes are literals on that kind below.
 */
const flags = {
  isInLibrary: z.boolean(),
  isInDraws: z.boolean(),
  isInSetPacks: z.boolean(),
  isInMechanicPacks: z.boolean(),
  isRepeatable: z.boolean(),
  hasHeldEffect: z.boolean(),
  hasUseEffect: z.boolean(),
  isKeptOnUse: z.boolean(),
}

/** Fields every kind has. */
const common = {
  name,
  /** The normalized name the import and the DM's form match definitions by. It follows the name when renamed. */
  nameKey: z.string().min(1),
  /** As written ("1", "X", "d6"); null when there is no cost. Only a True Word outside a draft needs one. */
  cost: z.string().min(1).max(CARD_LIMITS.cost).nullable(),
  /** Raw text, including the hidden `[bracket]` metadata. Show it through `visibleText`. Empty only in a draft. */
  text: z.string().max(CARD_LIMITS.text),
  /** Draft, active or retired (spec: definition-editing). Only the DM's device ever receives a draft. */
  status: z.enum(DEFINITION_STATUSES),
  /**
   * The change record of the newest definition step (`definitionChanges/{changeId}`), as a balance points at its
   * ledger entry. Definitions the import added and nobody changed since have none.
   */
  changeId: z.string().min(1).nullable().default(null),
  /**
   * Where the picture is in Cloud Storage (`cards/<id>/<hash>.webp`, `words/<id>/<hash>.webp` for a True Word), or
   * `null` for none. A stored definition may lack the field (it never had a picture) or hold `null` (the DM removed
   * it): both read as `null` here, and the difference matters only to the picture import.
   */
  picture: picturePathSchema.nullable().default(null),
  ...flags,
}

/** A normal card's set, rarity and mechanic pack may be empty only in a draft (see `isComplete`). */
const normalCardSchema = z.object({
  kind: z.literal('normal'),
  ...common,
  setCode: setCode.nullable(),
  rarity: z.enum(RARITIES).nullable(),
  mechanicPack: mechanicPack.nullable(),
  holder,
})

/** "Blessed" is a marker, not a set: Blessed cards have no set code and no rarity. */
const blessedCardSchema = z.object({
  kind: z.literal('blessed'),
  ...common,
  setCode: z.null(),
  rarity: z.null(),
  mechanicPack: mechanicPack.nullable(),
  holder,
})

/** Cursed cards form one global deck: no set code, rarity, or mechanic pack, and never in a pack's own cards. */
const cursedCardSchema = z.object({
  kind: z.literal('cursed'),
  ...common,
  // Fixed by the kind (FIXED_FLAGS in definitions/flags.ts).
  isInSetPacks: z.literal(false),
  isInMechanicPacks: z.literal(false),
  setCode: z.null(),
  rarity: z.null(),
  mechanicPack: z.null(),
  holder,
})

/**
 * A True Word (design D1 of unify-cards-and-true-words): a definition in the same collection, with its own `tw-` IDs.
 * No set, rarity or mechanic pack; any number of players can know it, and a use keeps it known.
 */
const trueWordSchema = z.object({
  kind: z.literal('trueWord'),
  ...common,
  // Fixed by the kind (FIXED_FLAGS in definitions/flags.ts).
  isInSetPacks: z.literal(false),
  isInMechanicPacks: z.literal(false),
  isRepeatable: z.literal(true),
  isKeptOnUse: z.literal(true),
  setCode: z.null(),
  rarity: z.null(),
  mechanicPack: z.null(),
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

/** The definition fields whose emptiness decides whether a word is complete. */
export type WordCompletenessFields = { cost: string | null; text: string }

/** The fields a word requires and that are empty here. */
export type MissingWordField = 'cost' | 'text'

/**
 * The required fields this word leaves empty: a True Word needs a cost and a text (spec: definition-editing,
 * "Complete definitions"). Keep in step with `completeCard` in `firestore.rules` and `scripts/lib/trueWordRows.ts`.
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
 * A definition at `cards/{cardId}`: a card or a True Word (design D1 of unify-cards-and-true-words). The import scripts
 * add them; the DM adds and changes them through the definition steps (spec: definition-editing); a card with one copy
 * changes its `holder` under the card-holdings rules. An active or retired definition is always complete, and only a
 * card with one copy (`isRepeatable` off) has a holder.
 */
export const definitionSchema = z
  .discriminatedUnion('kind', [
    normalCardSchema,
    blessedCardSchema,
    cursedCardSchema,
    trueWordSchema,
  ])
  .superRefine((definition, ctx) => {
    if (definition.holder !== null && definition.isRepeatable) {
      ctx.addIssue({
        code: 'custom',
        path: ['holder'],
        message: 'A repeatable card has no holder',
      })
    }
    if (definition.status === 'draft') return
    const missing =
      definition.kind === 'trueWord' ? missingWordFields(definition) : missingCardFields(definition)
    for (const field of missing) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `An ${definition.status} definition needs ${field}`,
      })
    }
  })

export const definitionConverter = createConverter(definitionSchema, { idField: 'id' })

/** A definition as features see it: the stored fields plus the document ID as `id`. */
export type Definition = z.infer<typeof definitionSchema> & { id: string }
/** A card: a normal, Blessed or Cursed definition. */
export type Card = Exclude<Definition, { kind: 'trueWord' }>
/** A True Word definition. */
export type TrueWord = Extract<Definition, { kind: 'trueWord' }>
export type NormalCard = Extract<Card, { kind: 'normal' }>
export type CursedCard = Extract<Card, { kind: 'cursed' }>

/** True for a card, false for a True Word. */
export function isCard(definition: Definition): definition is Card {
  return definition.kind !== 'trueWord'
}

/** True for a True Word. */
export function isTrueWord(definition: Definition): definition is TrueWord {
  return definition.kind === 'trueWord'
}

/** True when someone holds this card's one copy: it is out of the pool until that holding closes. */
export function isHeldCopy(definition: Pick<Definition, 'holder'>): boolean {
  return definition.holder !== null
}

/** The flags of a definition of kind `K`, with the values the kind fixes typed as literals. */
export type FlagsOf<K extends DefinitionKind> = Pick<Extract<Definition, { kind: K }>, BehaviorFlag>

/** `startingFlags`, typed for the kind's own definition. */
export function startingFlagsOf<K extends DefinitionKind>(kind: K, text: string): FlagsOf<K> {
  return startingFlags(kind, text) as FlagsOf<K>
}

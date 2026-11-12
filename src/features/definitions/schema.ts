import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { CARD_KINDS, CARD_LIMITS, RARITIES } from '@/features/cards/schema'
import { TRUE_WORD_LIMITS } from '@/features/true-words/schema'
import { createConverter } from '@/lib/firestore/converter'

import { picturePathSchema } from './picturePath'

import { DEFINITION_STATUSES, type DefinitionStatus } from './status'

/** What a change record is about. Keep in step with `firestore.rules`. */
export const DEFINITION_TARGETS = ['card', 'word'] as const
export type DefinitionTarget = (typeof DEFINITION_TARGETS)[number]

/** The DM's definition steps (design D5). Keep in step with `firestore.rules`. */
export const DEFINITION_STEPS = [
  'added',
  'edited',
  'published',
  'retired',
  'restored',
  'deleted',
] as const
export type DefinitionStep = (typeof DEFINITION_STEPS)[number]

/** The step a status pair is (design D5), or `null` when no step leads from `before` to `after`. */
export function stepFor(
  before: DefinitionStatus | null,
  after: DefinitionStatus | null,
): DefinitionStep | null {
  if (before === null) return after === 'draft' || after === 'active' ? 'added' : null
  if (after === null) return before === 'draft' ? 'deleted' : null
  if (before === after) return 'edited'
  if (before === 'draft' && after === 'active') return 'published'
  if (before === 'active' && after === 'retired') return 'retired'
  if (before === 'retired' && after === 'active') return 'restored'
  return null
}

/** What decides whether players see a definition: its status, and for a card whether it is DM-only. */
export type VisibilityOf = { status: DefinitionStatus; dmOnly?: boolean }

/** True when players see the definition: it is active or retired, and not a DM-only card. */
export function isPlayerVisible(definition: VisibilityOf | null): boolean {
  return (
    definition !== null &&
    (definition.status === 'active' || definition.status === 'retired') &&
    definition.dmOnly !== true
  )
}

/**
 * True when players may read the step's record: the definition is visible to players before or after it (spec:
 * definition-editing, "Who reads the change records"). Work on a draft or on a DM-only card stays the DM's, also after
 * the definition becomes visible. Keep in step with `visibleSnapshot` in `firestore.rules`.
 */
export function isPublicStep(before: VisibilityOf | null, after: VisibilityOf | null): boolean {
  return isPlayerVisible(before) || isPlayerVisible(after)
}

const id = z.string().min(1)
const status = z.enum(DEFINITION_STATUSES)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * A definition's picture in a snapshot: its path, or `null` for none, whether the definition never had a picture or
 * the DM removed it. Records from before pictures were stored have no field, which reads as `null`.
 */
const snapshotPicture = picturePathSchema.nullable().default(null)

/** A card's definition at one moment: every field the definition steps change, and its status. */
export const cardSnapshotSchema = z.object({
  kind: z.enum(CARD_KINDS),
  name: z.string().min(1).max(CARD_LIMITS.name),
  nameKey: z.string().min(1),
  setCode: z.string().min(1).max(CARD_LIMITS.setCode).nullable(),
  cost: z.string().min(1).max(CARD_LIMITS.cost).nullable(),
  rarity: z.enum(RARITIES).nullable(),
  mechanicPack: z.string().min(1).max(CARD_LIMITS.mechanicPack).nullable(),
  text: z.string().max(CARD_LIMITS.text),
  status,
  picture: snapshotPicture,
  /** Records from before DM-only cards have no field, which reads as `false`. */
  dmOnly: z.boolean().default(false),
})
export type CardSnapshot = z.infer<typeof cardSnapshotSchema>

/** A True Word's definition at one moment, with its status. */
export const wordSnapshotSchema = z.object({
  name: z.string().min(1).max(TRUE_WORD_LIMITS.name),
  nameKey: z.string().min(1),
  cost: z.string().min(1).max(TRUE_WORD_LIMITS.cost).nullable(),
  text: z.string().max(TRUE_WORD_LIMITS.text),
  status,
  picture: snapshotPicture,
})
export type WordSnapshot = z.infer<typeof wordSnapshotSchema>

/** The fields every DM step record has. */
const stepFields = {
  targetId: id,
  /** The definition's name after the step, or before it for a delete. */
  name: z.string().min(1),
  step: z.enum(DEFINITION_STEPS),
  public: z.boolean(),
  /** The DM who made the step. */
  by: id,
  at: serverTime,
}

const cardStepSchema = z.object({
  target: z.literal('card'),
  ...stepFields,
  before: cardSnapshotSchema.nullable(),
  after: cardSnapshotSchema.nullable(),
})

const wordStepSchema = z.object({
  target: z.literal('word'),
  ...stepFields,
  before: wordSnapshotSchema.nullable(),
  after: wordSnapshotSchema.nullable(),
})

/**
 * One definition an import added, or gave a picture. A picture import marks a DM-only card; records from before DM-only
 * cards have no field, which reads as `false`.
 */
export const importItemSchema = z.object({
  id,
  name: z.string().min(1),
  status,
  dmOnly: z.boolean().default(false),
})
export type ImportItem = z.infer<typeof importItemSchema>

/**
 * What an import brought: new definitions (`import-cards`, `import-true-words`), or pictures for stored ones
 * (`import-pictures`). Records from before the picture import have no field, which reads as `definitions`.
 */
export const IMPORT_KINDS = ['definitions', 'pictures'] as const
export type ImportKind = (typeof IMPORT_KINDS)[number]

/**
 * An import run's summary, written by an import script (design D7 of add-card-and-word-editing, D9 of
 * upload-card-and-word-pictures): one public record and one DM-only record of the drafts. The public record of a
 * definition import lists its active additions; that of a picture import the active and retired definitions that got
 * a picture. It names the import, not a user.
 */
const importRecordSchema = z.object({
  target: z.enum(DEFINITION_TARGETS),
  step: z.literal('imported'),
  what: z.enum(IMPORT_KINDS).default('definitions'),
  items: z.array(importItemSchema).min(1),
  public: z.boolean(),
  by: z.null(),
  at: serverTime,
})

/** A step record whose step, visibility and name agree with its two snapshots. */
function checkStep(
  record: { step: DefinitionStep; public: boolean; name: string } & {
    before: (VisibilityOf & { name: string }) | null
    after: (VisibilityOf & { name: string }) | null
  },
  ctx: z.RefinementCtx,
) {
  const before = record.before?.status ?? null
  const after = record.after?.status ?? null
  if (stepFor(before, after) !== record.step) {
    ctx.addIssue({
      code: 'custom',
      path: ['step'],
      message: 'The step does not match the statuses',
    })
  }
  if (isPublicStep(record.before, record.after) !== record.public) {
    ctx.addIssue({ code: 'custom', path: ['public'], message: 'The visibility does not match' })
  }
  const name = record.after?.name ?? record.before?.name
  if (name !== record.name) {
    ctx.addIssue({ code: 'custom', path: ['name'], message: 'The name does not match' })
  }
}

/**
 * One definition change, at `definitionChanges/{changeId}` (spec: definition-editing, "Change records"). A DM step
 * holds the definition before and after it; an import holds the definitions it added. Records never change and are
 * never deleted. Players read only the public ones.
 */
export const definitionChangeSchema = z.union([
  cardStepSchema.superRefine(checkStep),
  wordStepSchema.superRefine(checkStep),
  importRecordSchema.superRefine((record, ctx) => {
    const isPublic = record.items.every(
      (item) =>
        !item.dmOnly &&
        (record.what === 'pictures' ? item.status !== 'draft' : item.status === 'active'),
    )
    const isPrivate = record.items.every((item) => item.status === 'draft' || item.dmOnly)
    if (record.public ? !isPublic : !isPrivate) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'The items do not match the visibility',
      })
    }
  }),
])

export type DefinitionChange = z.infer<typeof definitionChangeSchema> & { id: string }
export type DefinitionStepRecord = Exclude<DefinitionChange, { step: 'imported' }>
export type ImportRecord = Extract<DefinitionChange, { step: 'imported' }>
export const definitionChangeConverter = createConverter(definitionChangeSchema, { idField: 'id' })

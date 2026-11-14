import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { setPicturePathSchema } from '@/features/definitions/picturePath'
import { createConverter } from '@/lib/firestore/converter'

/** A set's limits (spec: card-sets, "Field limits"). Keep in step with `validSet` in `firestore.rules`. */
export const SET_LIMITS = {
  code: 100,
  name: 100,
  alias: 100,
  aliases: 10,
} as const

/**
 * The pack layouts (spec: card-sets, "Pack layouts"), named after the pack types they give: `standard` gives a
 * Standard, a Premium and a Cursed Pack, `pandemonium` a Pack and a Cursed Pack as Pandemonium has. Keep in step with
 * `firestore.rules` and `scripts/lib/setRows.ts`.
 */
export const PACK_LAYOUTS = ['standard', 'pandemonium'] as const
export type PackLayout = (typeof PACK_LAYOUTS)[number]

/** The set form's names of the layouts. */
export const PACK_LAYOUT_LABELS: Readonly<Record<PackLayout, string>> = {
  standard: 'Standart / Premium / Cursed',
  pandemonium: 'Tek paket + Cursed',
}

/**
 * A set picture: its path, or `null` for none. A set that never had one lacks the field, and one whose picture the DM
 * removed (or that the DM added without one) holds `null` (design D6). Both read as `null` here; the difference
 * matters only to the set import.
 */
const setPicture = setPicturePathSchema.nullable().default(null)

/**
 * A card set at `sets/{setId}`, the ID being its normalized code (design D1). The import adds the repository's sets;
 * the DM adds, edits, moves and deletes them through `api.ts`, each with its record.
 */
export const cardSetSchema = z.object({
  /** How card data names the set. Never changes. */
  code: z.string().min(1).max(SET_LIMITS.code),
  /** The official name the interface shows. */
  name: z.string().min(1).max(SET_LIMITS.name),
  /** Other spellings that also mean this set. */
  aliases: z.array(z.string().min(1).max(SET_LIMITS.alias)).max(SET_LIMITS.aliases),
  /** The shop order: lower first. Gaps are allowed (design D2). */
  position: z.number().int(),
  packLayout: z.enum(PACK_LAYOUTS),
  cardback: setPicture,
  /** The set's Cardmaker. */
  mascot: setPicture,
  /** The record of the set's newest step (`setChanges/{changeId}`). */
  changeId: z.string().min(1).nullable().default(null),
})

export const cardSetConverter = createConverter(cardSetSchema, { idField: 'id' })

/** A set as features see it: the stored fields plus the document ID as `id`. */
export type CardSet = z.infer<typeof cardSetSchema> & { id: string }

/** The set steps a record names (design D3). `imported` is the set import's. Keep in step with `firestore.rules`. */
export const SET_STEPS = ['added', 'edited', 'moved', 'deleted', 'imported'] as const
export type SetStep = (typeof SET_STEPS)[number]

/** The fields an edit can change, as a record names them. */
export const SET_FIELDS = ['name', 'aliases', 'packLayout', 'cardback', 'mascot'] as const
export type SetField = (typeof SET_FIELDS)[number]

/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * A set change record at `setChanges/{changeId}` (spec: card-sets, "Set change records"). Every signed-in user reads
 * them; none ever changes. An import's record names no set of its own: `added` and `pictured` name its sets.
 */
export const setChangeSchema = z.object({
  /** The DM, or `null` for the import. */
  by: z.string().min(1).nullable(),
  at: serverTime,
  step: z.enum(SET_STEPS),
  setId: z.string().min(1).nullable(),
  code: z.string().min(1).nullable(),
  /** The set's official name after the step, or before it for a delete. */
  name: z.string().min(1).nullable(),
  /** The fields an edit changed. */
  fields: z.array(z.enum(SET_FIELDS)),
  /** Which way a move went. */
  direction: z.enum(['up', 'down']).nullable(),
  /** The official names of the sets an import added. */
  added: z.array(z.string()).default([]),
  /** The official names of the sets an import gave a picture. */
  pictured: z.array(z.string()).default([]),
})

export const setChangeConverter = createConverter(setChangeSchema, { idField: 'id' })

/** A set change record with its document ID as `id`. */
export type SetChange = z.infer<typeof setChangeSchema> & { id: string }

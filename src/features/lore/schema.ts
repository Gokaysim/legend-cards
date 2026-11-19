import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/** The most characters a card's lore holds. Keep in step with `validLore` in `firestore.rules`. */
export const LORE_LIMIT = 10000

/** Characters as the rules count them: code points, so an emoji counts once. */
export function loreLength(text: string): number {
  return Array.from(text).length
}

/**
 * A card's lore at `cardLore/{cardId}` (spec: card-lore; design D1 of polish-sidebar-mascots-and-lore): the story of
 * the character on the card, written by the DM. It is apart from the card's definition, so reading the cards never
 * reads it. A card without lore has no document; clearing the lore deletes it.
 */
export const loreSchema = z.object({
  /** Plain text with line breaks, as typed: never empty. */
  text: z
    .string()
    .min(1)
    .refine((text) => loreLength(text) <= LORE_LIMIT),
  /** The uid of the DM who saved it last. */
  updatedBy: z.string().min(1),
  /** A server timestamp. `null` only in the local snapshot while the server time is pending. */
  updatedAt: z.instanceof(Timestamp).nullable(),
})

export type Lore = z.infer<typeof loreSchema>
export const loreConverter = createConverter(loreSchema)

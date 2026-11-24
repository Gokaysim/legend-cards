import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

import type { EffectVariants } from './draftRules'
import { EFFECT_TEXT_MAX, EFFECT_TYPES } from './effectTypes'

export { EFFECT_TEXT_MAX } from './effectTypes'

/** The collection of the custom effect texts, and its one document. Keep in step with `firestore.rules`. */
export const CUSTOM_EFFECTS_COLLECTION = 'customEffects'
export const CUSTOM_EFFECTS_DOC = 'main'

const text = z.string().min(1).max(EFFECT_TEXT_MAX)

/** One type's texts, by cost. A cost other than 1, 3 or 5 is rejected. */
const typeVariantsSchema = z.strictObject({
  '1': text.optional(),
  '3': text.optional(),
  '5': text.optional(),
})

/**
 * The custom effect variants, at `customEffects/main` (design D2 of add-custom-card-draft): each of the 18 types' texts
 * at 1, 3 and 5-cost. Every member reads it; only the `import-custom-effects` script writes it. A missing document
 * means that no variant is loaded.
 */
export const customEffectsSchema = z.object({
  variants: z.partialRecord(z.enum(EFFECT_TYPES), typeVariantsSchema),
  /** When the last import ran. */
  importedAt: z.instanceof(Timestamp).nullable(),
})

export type CustomEffects = z.infer<typeof customEffectsSchema>

/** No variant loaded. */
export const EMPTY_VARIANTS: EffectVariants = {}

export const customEffectsConverter = createConverter(customEffectsSchema)

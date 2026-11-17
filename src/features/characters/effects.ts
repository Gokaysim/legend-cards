import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

// Effects on a character, at `characterEffects/{effectId}` (design D1 of add-character-effects; spec:
// character-effects). Created and deleted, never changed. Keep in step with `firestore.rules`.

export const CHARACTER_EFFECTS_COLLECTION = 'characterEffects'

/**
 * Where an effect comes from: a used card, a used True Word, a player's own effect ("Özel"), or the DM's ("DM").
 */
export const EFFECT_SOURCES = ['card', 'word', 'own', 'dm'] as const
export type EffectSource = (typeof EFFECT_SOURCES)[number]

/** The limits of an effect written by hand, and of one copied from a used card or word. */
export const EFFECT_LIMITS = {
  byHand: { name: 60, text: 500 },
  fromUse: { name: 200, text: 2000 },
} as const

/** Whether an effect comes from a use: it then names the use and copies the card's or word's text. */
export function isFromUse(source: EffectSource): boolean {
  return source === 'card' || source === 'word'
}

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

export const characterEffectSchema = z
  .object({
    characterId: id,
    /** The character's owner, copied so a delete needs no read of the character. */
    uid: id,
    source: z.enum(EFFECT_SOURCES),
    /** The holding of a card's use, or the word use; `null` for an effect written by hand. */
    sourceId: id.nullable(),
    name: z.string().min(1).max(EFFECT_LIMITS.fromUse.name),
    text: z.string().max(EFFECT_LIMITS.fromUse.text),
    /** Only a Cursed card's effect: it shows in the Cursed color. */
    cursed: z.boolean(),
    /**
     * Only a Blessed card's effect: it shows in the Blessed color. Effects stored before the field existed have none and
     * read as not Blessed (design D6 of redesign-hand-dashboard).
     */
    blessed: z.boolean().default(false),
    createdBy: id,
    createdAt: serverTime,
  })
  .superRefine((effect, context) => {
    const issue = (path: string, message: string) => {
      context.addIssue({ code: 'custom', path: [path], message })
    }
    if (isFromUse(effect.source) !== (effect.sourceId !== null)) {
      issue('sourceId', 'an effect names its use exactly when it comes from one')
    }
    if (effect.cursed && effect.source !== 'card') {
      issue('cursed', 'only a card effect is Cursed')
    }
    if (effect.blessed && (effect.source !== 'card' || effect.cursed)) {
      issue('blessed', 'only a card effect that is not Cursed is Blessed')
    }
    if (!isFromUse(effect.source)) {
      if (Array.from(effect.name).length > EFFECT_LIMITS.byHand.name) {
        issue('name', 'an effect written by hand has a name of at most 60 characters')
      }
      const length = Array.from(effect.text).length
      if (length < 1 || length > EFFECT_LIMITS.byHand.text) {
        issue('text', 'an effect written by hand has a text of 1 to 500 characters')
      }
    }
  })

export type StoredCharacterEffect = z.infer<typeof characterEffectSchema>

/** An effect as features see it: the stored fields plus the document ID as `id`. */
export type CharacterEffect = StoredCharacterEffect & { id: string }

export const characterEffectConverter = createConverter(characterEffectSchema, { idField: 'id' })

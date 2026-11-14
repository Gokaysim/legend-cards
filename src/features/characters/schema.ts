import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { characterPicturePathSchema, isPicturePathOf } from '@/features/definitions/picturePath'
import { createConverter } from '@/lib/firestore/converter'
import { InvalidDataError } from '@/lib/firestore/errors'

/** A character's limits (spec: characters, "Character records"). Keep in step with `validCharacter` in `firestore.rules`. */
export const CHARACTER_LIMITS = {
  name: 40,
} as const

export const CHARACTERS_COLLECTION = 'characters'

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * A character at `characters/{characterId}` (design D1 of add-characters): a user's player character, or an NPC the DM
 * keeps. The ID is a Firestore auto ID. A character is never deleted, only archived.
 */
export const characterSchema = z.object({
  /** The owner. */
  uid: id,
  name: z.string().min(1).max(CHARACTER_LIMITS.name),
  /** The photo's path, `characters/<characterId>/<hash>.webp`, or `null` for none. */
  picture: characterPicturePathSchema.nullable(),
  archived: z.boolean(),
  createdAt: serverTime,
  /** The user who added it: the owner or the DM. */
  createdBy: id,
})

export type StoredCharacter = z.infer<typeof characterSchema>

/** A character as features see it: the stored fields plus the document ID as `id`. */
export type Character = StoredCharacter & { id: string }

const baseConverter = createConverter(characterSchema, { idField: 'id' })

/**
 * The characters' converter. Besides the schema, a photo must be one of this very character's, which only the
 * document ID tells.
 */
export const characterConverter: typeof baseConverter = {
  ...baseConverter,
  fromFirestore(snapshot, options) {
    const character = baseConverter.fromFirestore(snapshot, options)
    if (
      character.picture !== null &&
      !isPicturePathOf('character', character.id, character.picture)
    ) {
      throw new InvalidDataError(snapshot.ref.path, [
        {
          code: 'custom',
          path: ['picture'],
          message: "a photo is one of this character's own",
          input: character.picture,
        },
      ])
    }
    return character
  },
}

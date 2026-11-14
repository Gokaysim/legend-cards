import { Timestamp } from 'firebase/firestore'

import type { Character } from '@/features/characters/schema'
import { picturePath } from '@/features/definitions/picturePath'

/** A character ID as Firestore makes them: 20 letters and digits, from a short name. */
export function testCharacterId(name: string): string {
  return `${name.replace(/[^A-Za-z0-9]/g, '')}${'0'.repeat(20)}`.slice(0, 20)
}

/**
 * A character for tests: `name`, owned and added by `uid`, unarchived, without a photo, added at `addedAtMillis`.
 * `withPhoto` gives it a stored photo with a fixed hash.
 */
export function testCharacter(
  name: string,
  uid: string,
  {
    addedAtMillis = 1000,
    withPhoto = false,
    ...overrides
  }: Partial<Character> & { addedAtMillis?: number; withPhoto?: boolean } = {},
): Character {
  const id = overrides.id ?? testCharacterId(name)
  return {
    id,
    uid,
    name,
    picture: withPhoto ? picturePath('character', id, '0123456789') : null,
    archived: false,
    createdAt: Timestamp.fromMillis(addedAtMillis),
    createdBy: uid,
    ...overrides,
  }
}

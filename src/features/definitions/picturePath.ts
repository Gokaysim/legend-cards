import { z } from 'zod'

// Where a card's, True Word's or set's picture is stored in Cloud Storage (design D2 of upload-card-and-word-pictures,
// D6 of add-set-management): `cards/<cardId>/<hash>.webp`, `words/<wordId>/<hash>.webp` or `sets/<setId>/<hash>.webp`,
// the hash being the first 10 hex digits of the SHA-256 of the WebP file. Keep in step with `storage.rules`,
// `firestore.rules`, `scripts/lib/importPictures.ts` and `scripts/lib/importSets.ts`.

/** What a picture belongs to: a card, a True Word or a set. */
export type PictureTarget = 'card' | 'word' | 'set'

/** The Cloud Storage folder of each target. */
export const PICTURE_FOLDERS: Readonly<Record<PictureTarget, string>> = {
  card: 'cards',
  word: 'words',
  set: 'sets',
}

/** A content hash as a picture's file name carries it: 10 lowercase hex digits. */
const HASH = /^[0-9a-f]{10}$/

/** A definition's stored picture's path. */
const PICTURE_PATH = /^(cards|words)\/[^/]+\/[0-9a-f]{10}\.webp$/

/** A stored picture's path, as a definition's `picture` holds it. */
export const picturePathSchema = z.string().regex(PICTURE_PATH)

/** A set's stored picture's path, as its `cardback` or `mascot` holds it. The set's ID is its normalized code. */
export const setPicturePathSchema = z.string().regex(/^sets\/[a-z0-9]+\/[0-9a-f]{10}\.webp$/)

/** The path of the picture with this content hash for this card or word. Throws on a hash that is not 10 hex digits. */
export function picturePath(target: PictureTarget, id: string, hash: string): string {
  if (!HASH.test(hash)) throw new Error(`Not a picture hash: ${hash}`)
  return `${PICTURE_FOLDERS[target]}/${id}/${hash}.webp`
}

/** True when `path` is a picture path of this very card or word. */
export function isPicturePathOf(target: PictureTarget, id: string, path: string): boolean {
  const prefix = `${PICTURE_FOLDERS[target]}/${id}/`
  return path.startsWith(prefix) && /^[0-9a-f]{10}\.webp$/.test(path.slice(prefix.length))
}

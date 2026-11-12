import { z } from 'zod'

// Where a card's or True Word's picture is stored in Cloud Storage (design D2 of upload-card-and-word-pictures):
// `cards/<cardId>/<hash>.webp` or `words/<wordId>/<hash>.webp`, the hash being the first 10 hex digits of the
// SHA-256 of the WebP file. Keep in step with `storage.rules`, `firestore.rules` and `scripts/lib/importPictures.ts`.

/** What a picture belongs to: a card or a True Word. */
export type PictureTarget = 'card' | 'word'

/** The Cloud Storage folder of each target. */
export const PICTURE_FOLDERS: Readonly<Record<PictureTarget, string>> = {
  card: 'cards',
  word: 'words',
}

/** A content hash as a picture's file name carries it: 10 lowercase hex digits. */
const HASH = /^[0-9a-f]{10}$/

/** Any stored picture's path, whatever it belongs to. */
const PICTURE_PATH = /^(cards|words)\/[^/]+\/[0-9a-f]{10}\.webp$/

/** A stored picture's path, as a definition's `picture` holds it. */
export const picturePathSchema = z.string().regex(PICTURE_PATH)

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

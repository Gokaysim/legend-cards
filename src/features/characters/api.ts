import {
  collection,
  type CollectionReference,
  doc,
  type Firestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import { KEEP_PICTURE, type PictureChoice } from '@/features/definitions/api'
import { picturePath } from '@/features/definitions/picturePath'
import { NO_PICTURE_STORE, type PictureStore } from '@/features/definitions/pictureStore'
import { cleanText } from '@/lib/text'

import { PhotoNeedsConnectionError } from './errors'
import {
  type Character,
  CHARACTER_LIMITS,
  characterConverter,
  CHARACTERS_COLLECTION,
} from './schema'

// The character steps (design D3, D4 of add-characters). They are plain writes, not transactions: without a new
// photo, a step is queued offline and shows at once. A new photo is uploaded first, then the document is written and
// confirmed by the server; a failed write deletes the upload, and a successful one the replaced photo.

/** Every character, validated and with the document ID as `id`. Every signed-in user reads them all. */
export function charactersRef(db: Firestore): CollectionReference<Character> {
  return collection(db, CHARACTERS_COLLECTION).withConverter(characterConverter)
}

/** Whether the device has a connection. The browser's own answer by default; tests inject theirs. */
export type IsOnline = () => boolean

const browserIsOnline: IsOnline = () => typeof navigator === 'undefined' || navigator.onLine

/** A character's name as stored: trimmed and cut to the limit. Throws on a blank name, which the form never sends. */
export function characterName(name: string): string {
  const cleaned = cleanText(name, CHARACTER_LIMITS.name)
  if (cleaned === null) throw new Error('A character needs a name')
  return cleaned
}

/** The file name "İndir" would save a photo under. */
function downloadName(characterId: string): string {
  return `character-${characterId}.webp`
}

/** Runs a store call whose failure must not undo or fail a step: an unused file is all it leaves. */
async function forget(call: Promise<void>): Promise<void> {
  try {
    await call
  } catch (error) {
    if (import.meta.env.DEV) console.warn('A character photo file was not deleted:', error)
  }
}

/**
 * Uploads a new photo, writes the document, and tidies up: the upload is deleted when the write fails, and the
 * replaced photo when it succeeds. Without a new photo, it only writes.
 */
async function withPhoto(
  pictures: PictureStore,
  isOnline: IsOnline,
  characterId: string,
  current: string | null,
  choice: PictureChoice,
  write: (picture: string | null) => Promise<void>,
): Promise<void> {
  if (choice.kind === 'keep') return write(current)
  if (choice.kind === 'remove') {
    await write(null)
    if (current !== null) await forget(pictures.remove(current))
    return
  }
  if (!isOnline()) throw new PhotoNeedsConnectionError()
  const next = picturePath('character', characterId, choice.hash)
  if (next === current) return write(current)
  await pictures.upload(next, choice.blob, downloadName(characterId))
  try {
    await write(next)
  } catch (error) {
    await forget(pictures.remove(next))
    throw error
  }
  if (current !== null) await forget(pictures.remove(current))
}

export type AddCharacterInput = {
  /** The owner. */
  uid: string
  name: string
  /** The signed-in user: the owner or the DM. */
  by: string
  picture?: PictureChoice
}

/**
 * Adds a character for `uid` (spec: characters, "Who adds a character"). Returns its ID. Throws
 * `PhotoNeedsConnectionError` offline when a photo was chosen, before anything is stored.
 */
export async function addCharacter(
  db: Firestore,
  input: AddCharacterInput,
  pictures: PictureStore = NO_PICTURE_STORE,
  isOnline: IsOnline = browserIsOnline,
): Promise<string> {
  const ref = doc(collection(db, CHARACTERS_COLLECTION))
  const name = characterName(input.name)
  await withPhoto(pictures, isOnline, ref.id, null, input.picture ?? KEEP_PICTURE, (picture) =>
    setDoc(ref, {
      uid: input.uid,
      name,
      picture,
      archived: false,
      createdAt: serverTimestamp(),
      createdBy: input.by,
    }),
  )
  return ref.id
}

export type SaveCharacterInput = {
  /** The character as the form saw it. */
  character: Character
  name: string
  picture?: PictureChoice
}

/**
 * Saves a character's name and photo (spec: characters, "Who edits a character"). A save that changes nothing writes
 * nothing. Throws `PhotoNeedsConnectionError` offline when a new photo was chosen.
 */
export async function saveCharacter(
  db: Firestore,
  input: SaveCharacterInput,
  pictures: PictureStore = NO_PICTURE_STORE,
  isOnline: IsOnline = browserIsOnline,
): Promise<void> {
  const { character } = input
  const name = characterName(input.name)
  const ref = doc(db, CHARACTERS_COLLECTION, character.id)
  await withPhoto(
    pictures,
    isOnline,
    character.id,
    character.picture,
    input.picture ?? KEEP_PICTURE,
    async (picture) => {
      const update: Record<string, unknown> = {}
      if (name !== character.name) update.name = name
      if (picture !== character.picture) update.picture = picture
      if (Object.keys(update).length > 0) await updateDoc(ref, update)
    },
  )
}

/** Archives a character, or brings it back (spec: characters, "Characters are archived, never deleted"). */
export function setCharacterArchived(
  db: Firestore,
  characterId: string,
  archived: boolean,
): Promise<void> {
  return updateDoc(doc(db, CHARACTERS_COLLECTION, characterId), { archived })
}

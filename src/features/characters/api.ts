import {
  collection,
  type CollectionReference,
  deleteDoc,
  deleteField,
  doc,
  type Firestore,
  serverTimestamp,
  setDoc,
  type Transaction,
  updateDoc,
} from 'firebase/firestore'

import { KEEP_PICTURE, type PictureChoice } from '@/features/definitions/api'
import { picturePath } from '@/features/definitions/picturePath'
import { NO_PICTURE_STORE, type PictureStore } from '@/features/definitions/pictureStore'
import { cleanText } from '@/lib/text'

import {
  type CharacterEffect,
  characterEffectConverter,
  CHARACTER_EFFECTS_COLLECTION,
  EFFECT_LIMITS,
} from './effects'
import { CharacterUnavailableError, PhotoNeedsConnectionError } from './errors'
import {
  type Character,
  CHARACTER_LIMITS,
  characterConverter,
  CHARACTERS_COLLECTION,
} from './schema'
import { NO_USE_TARGET, type ResolvedUseTarget, USED_ON_MAX, type UseTarget } from './useTarget'

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
  /** The sheet link as `readSheetUrl` gives it, or `null` or missing for none. */
  sheetUrl?: string | null
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
      ...(input.sheetUrl ? { sheetUrl: input.sheetUrl } : {}),
    }),
  )
  return ref.id
}

export type SaveCharacterInput = {
  /** The character as the form saw it. */
  character: Character
  name: string
  picture?: PictureChoice
  /**
   * The sheet link as `readSheetUrl` gives it, `null` to remove it, or missing to keep it (spec: characters, "Who
   * changes a sheet link").
   */
  sheetUrl?: string | null
}

/**
 * Saves a character's name, photo and sheet link in one write (spec: characters, "Who edits a character", "Who
 * changes a sheet link"). A save that changes nothing writes nothing. A removed link deletes the field, so a character
 * never stores `null` as its link (design D1 of add-character-sheet-link). Throws `PhotoNeedsConnectionError` offline
 * when a new photo was chosen.
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
      const sheetUrl =
        input.sheetUrl === undefined ? character.sheetUrl : (input.sheetUrl ?? undefined)
      if (sheetUrl !== character.sheetUrl) update.sheetUrl = sheetUrl ?? deleteField()
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

/**
 * Reads a use's target inside its transaction (design D5 of add-character-effects): a chosen character's current
 * name, or a typed name. Throws `CharacterUnavailableError` when the chosen character is missing or archived.
 */
export async function readUseTarget(
  transaction: Transaction,
  db: Firestore,
  target: UseTarget = NO_USE_TARGET,
): Promise<ResolvedUseTarget | null> {
  switch (target.kind) {
    case 'none':
      return null
    case 'typed': {
      const name = cleanText(target.name, USED_ON_MAX)
      return name === null ? null : { name, characterId: null, ownerUid: null }
    }
    case 'character': {
      const character = (
        await transaction.get(
          doc(db, CHARACTERS_COLLECTION, target.characterId).withConverter(characterConverter),
        )
      ).data()
      if (character === undefined || character.archived) throw new CharacterUnavailableError()
      return { name: character.name, characterId: character.id, ownerUid: character.uid }
    }
  }
}

/** Every effect, validated and with the document ID as `id`. Every signed-in user reads them all. */
export function characterEffectsRef(db: Firestore): CollectionReference<CharacterEffect> {
  return collection(db, CHARACTER_EFFECTS_COLLECTION).withConverter(characterEffectConverter)
}

/** Cuts a text to `max` characters by code points, so an emoji at the limit is never split in half. */
function cut(text: string, max: number): string {
  return Array.from(text).slice(0, max).join('')
}

/**
 * What a use's effect copies: the card's or word's name and visible text at the time, and whether it is Cursed or
 * Blessed.
 */
export type UseEffectContent = { name: string; text: string; cursed: boolean; blessed: boolean }

/**
 * Adds the effect of a use to the use's transaction (design D2 of add-character-effects), on the character the use
 * names. Does nothing for a use without a chosen character. The caller has already read everything it needs: a
 * transaction writes only after its reads.
 */
export function setUseEffect(
  transaction: Transaction,
  db: Firestore,
  input: {
    target: ResolvedUseTarget | null
    source: 'card' | 'word'
    /** The holding of a card's use, or the new word use. */
    sourceId: string
    content: UseEffectContent
    by: string
  },
): void {
  const { target } = input
  if (target?.characterId == null || target.ownerUid === null) return
  transaction.set(doc(collection(db, CHARACTER_EFFECTS_COLLECTION)), {
    characterId: target.characterId,
    uid: target.ownerUid,
    source: input.source,
    sourceId: input.sourceId,
    name: cut(input.content.name, EFFECT_LIMITS.fromUse.name),
    text: cut(input.content.text, EFFECT_LIMITS.fromUse.text),
    cursed: input.source === 'card' && input.content.cursed,
    blessed: input.source === 'card' && input.content.blessed,
    createdBy: input.by,
    createdAt: serverTimestamp(),
  })
}

export type AddEffectInput = {
  character: Pick<Character, 'id' | 'uid'>
  name: string
  text: string
  /** The signed-in user: the character's owner, or the DM. */
  by: string
  /** Whether the user is the DM: the effect is then the DM's (`dm`), otherwise the owner's own (`own`). */
  isDm: boolean
}

/**
 * Adds an effect written by hand (spec: character-effects, "Own effects and DM effects"; design D3). A plain write:
 * offline, it is queued and shows at once, so the caller need not wait for the server.
 */
export function addEffect(db: Firestore, input: AddEffectInput): Promise<void> {
  const ref = doc(collection(db, CHARACTER_EFFECTS_COLLECTION))
  const name = cleanText(input.name, EFFECT_LIMITS.byHand.name)
  const text = cleanText(input.text, EFFECT_LIMITS.byHand.text)
  if (name === null || text === null) throw new Error('An effect needs a name and a text')
  return setDoc(ref, {
    characterId: input.character.id,
    uid: input.character.uid,
    source: input.isDm ? 'dm' : 'own',
    sourceId: null,
    name,
    text,
    cursed: false,
    blessed: false,
    createdBy: input.by,
    createdAt: serverTimestamp(),
  })
}

/** Removes an effect by deleting it (spec: character-effects, "Removing an effect"). A plain write, queued offline. */
export function removeEffect(db: Firestore, effectId: string): Promise<void> {
  return deleteDoc(doc(db, CHARACTER_EFFECTS_COLLECTION, effectId))
}

import {
  doc,
  type DocumentReference,
  type Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { type Note, NOTE_LIMITS, noteConverter } from './schema'

/** Collections. Keep in step with `firestore.rules`. */
export const PLAYER_NOTES_COLLECTION = 'playerNotes'
export const DM_NOTES_COLLECTION = 'dmNotes'

/** The player note about `uid`, which every signed-in user reads. */
export function playerNoteRef(db: Firestore, uid: string): DocumentReference<Note> {
  return doc(db, PLAYER_NOTES_COLLECTION, uid).withConverter(noteConverter)
}

/** The DM note about `uid`. Only the DM may read it: never build this ref on a player's device. */
export function dmNoteRef(db: Firestore, uid: string): DocumentReference<Note> {
  return doc(db, DM_NOTES_COLLECTION, uid).withConverter(noteConverter)
}

/** What a save writes: the note about `uid`, saved by the signed-in user `by`. */
export type NoteSave = {
  uid: string
  text: string
  by: string
}

/** The text as stored: cut to the limit by code points, so an emoji at the limit is never split in half. */
export function noteText(text: string): string {
  return Array.from(text).slice(0, NOTE_LIMITS.text).join('')
}

/**
 * Writes the whole note. It is not a transaction: offline, the write is queued and sent when the connection
 * returns, and when two users save the same note, the last save wins.
 */
function saveNote(db: Firestore, collectionName: string, { uid, text, by }: NoteSave) {
  return setDoc(doc(db, collectionName, uid), {
    text: noteText(text),
    updatedBy: by,
    updatedAt: serverTimestamp(),
  })
}

/** Saves the player note (the player themselves, or the DM). */
export function savePlayerNote(db: Firestore, save: NoteSave): Promise<void> {
  return saveNote(db, PLAYER_NOTES_COLLECTION, save)
}

/** Saves the DM note (the DM only). */
export function saveDmNote(db: Firestore, save: NoteSave): Promise<void> {
  return saveNote(db, DM_NOTES_COLLECTION, save)
}

import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/** Field limits. Keep in step with `validNoteDoc` in `firestore.rules`. */
export const NOTE_LIMITS = {
  text: 2000,
} as const

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * One note about one player: the player note at `playerNotes/{uid}`, or the DM note at `dmNotes/{uid}`. The
 * document ID is the player's uid. A missing document is an empty note; a note is never deleted, so emptying it
 * stores an empty text.
 */
export const noteSchema = z.object({
  /** Plain text with line breaks, as typed. */
  text: z.string().max(NOTE_LIMITS.text),
  /** The uid of the user who saved the note last. */
  updatedBy: id,
  updatedAt: serverTime,
})

export type Note = z.infer<typeof noteSchema>
export const noteConverter = createConverter(noteSchema)

/** Whether a note has text other than spaces and line breaks. A missing note has none. */
export function hasNoteText(note: Note | null): boolean {
  return note !== null && note.text.trim() !== ''
}

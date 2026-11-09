import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { NoteSave } from './api'
import type { Note } from './schema'

/** Saving the notes. Each call writes the whole note, with `by` as its last editor. */
export type NoteActions = {
  savePlayerNote: (save: NoteSave) => Promise<void>
  saveDmNote: (save: NoteSave) => Promise<void>
}

/**
 * How the notes are read and saved. `PlayerNotesProvider` implements these hooks with Firestore; tests provide
 * fixed notes instead, so unit tests never load Firebase. Only the hand screen calls them, so the subscriptions
 * exist only while a hand is shown. A missing note reads as `null`.
 */
export type PlayerNotesSource = {
  /** The player note about `uid`, live. */
  usePlayerNote: (uid: string) => Subscription<Note | null>
  /** The DM note about `uid`, live. Requests nothing, and reads as no note, unless the user is the DM. */
  useDmNote: (uid: string) => Subscription<Note | null>
  actions: NoteActions
}

export const PlayerNotesContext = createContext<PlayerNotesSource | null>(null)

function usePlayerNotesSource(): PlayerNotesSource {
  const value = useContext(PlayerNotesContext)
  if (!value) throw new Error('Player notes hooks must be used inside <PlayerNotesProvider>')
  return value
}

/** The player note about `uid`, live. Must be used inside `<PlayerNotesProvider>`. */
export function usePlayerNote(uid: string): Subscription<Note | null> {
  return usePlayerNotesSource().usePlayerNote(uid)
}

/**
 * The DM note about `uid`, live. Must be used inside `<PlayerNotesProvider>`, and only by a component inside
 * `<DmOnly>`: on a player's device it requests nothing and reads as no note.
 */
export function useDmNote(uid: string): Subscription<Note | null> {
  return usePlayerNotesSource().useDmNote(uid)
}

/** Saving the notes. Must be used inside `<PlayerNotesProvider>`. */
export function useNoteActions(): NoteActions {
  return usePlayerNotesSource().actions
}

/**
 * The player whose DM note may be read: `uid` for the DM, `null` for anyone else, a loading profile included, so a
 * player's device never asks for a DM note (spec: player-notes, "Players never load a DM note").
 */
export function dmNoteTarget(isDm: boolean, uid: string): string | null {
  return isDm ? uid : null
}

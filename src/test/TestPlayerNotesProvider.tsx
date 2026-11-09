import { type ReactNode, useMemo } from 'react'

import {
  type NoteActions,
  PlayerNotesContext,
  type PlayerNotesSource,
} from '@/features/player-notes/playerNotesContext'
import type { Note } from '@/features/player-notes/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestNotes = {
  /** The player notes by uid, for example `ready(note)`. A uid without one reads as ready with no note. */
  playerNotes?: Record<string, Subscription<Note | null>>
  /** The DM notes by uid, the same way. */
  dmNotes?: Record<string, Subscription<Note | null>>
  /** Fakes for the saves, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<NoteActions>
  /**
   * Called with the uid each time a component reads a DM note, for example `vi.fn()`. A test can show that a
   * player's screen never asks for one.
   */
  onUseDmNote?: (uid: string) => void
}

export type TestPlayerNotesProviderProps = TestNotes & { children: ReactNode }

const SUCCEEDING_ACTIONS: NoteActions = {
  savePlayerNote: () => Promise.resolve(),
  saveDmNote: () => Promise.resolve(),
}

/** Provides fixed notes and fake saves to components under test, without Firebase. */
export function TestPlayerNotesProvider({
  playerNotes,
  dmNotes,
  actions,
  onUseDmNote,
  children,
}: TestPlayerNotesProviderProps) {
  const value = useMemo<PlayerNotesSource>(
    () => ({
      usePlayerNote: (uid) => playerNotes?.[uid] ?? ready(null),
      useDmNote: (uid) => {
        onUseDmNote?.(uid)
        return dmNotes?.[uid] ?? ready(null)
      },
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [playerNotes, dmNotes, actions, onUseDmNote],
  )
  return <PlayerNotesContext value={value}>{children}</PlayerNotesContext>
}

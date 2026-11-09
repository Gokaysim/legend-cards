import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { dmNoteRef, playerNoteRef, saveDmNote, savePlayerNote } from './api'
import { dmNoteTarget, type PlayerNotesSource, PlayerNotesContext } from './playerNotesContext'

function useFirestorePlayerNote(uid: string) {
  const auth = useAuth()
  const isSignedIn = auth.status === 'signedIn'
  const ref = useMemo(() => (isSignedIn ? playerNoteRef(db, uid) : null), [isSignedIn, uid])
  return useDocument(ref)
}

function useFirestoreDmNote(uid: string) {
  const target = dmNoteTarget(useIsDm(), uid)
  const ref = useMemo(() => (target === null ? null : dmNoteRef(db, target)), [target])
  return useDocument(ref)
}

const source: PlayerNotesSource = {
  usePlayerNote: useFirestorePlayerNote,
  useDmNote: useFirestoreDmNote,
  actions: {
    savePlayerNote: (save) => savePlayerNote(db, save),
    saveDmNote: (save) => saveDmNote(db, save),
  },
}

/**
 * Lets the hand screen read and save the player notes and the DM notes in Firestore. It subscribes to nothing
 * itself: the hand screen subscribes through these hooks while a hand is shown, and only the DM's device ever
 * subscribes to a DM note. Mounted once in `App.tsx`.
 */
export function PlayerNotesProvider({ children }: { children: ReactNode }) {
  return <PlayerNotesContext value={source}>{children}</PlayerNotesContext>
}

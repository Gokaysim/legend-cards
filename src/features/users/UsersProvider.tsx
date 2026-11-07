import { type ReactNode, useEffect, useMemo, useRef } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import type { Subscription } from '@/lib/firestore/subscription'
import { useCollection } from '@/lib/firestore/useCollection'
import { useDocument } from '@/lib/firestore/useDocument'

import { ensureProfile, profileRef, profilesRef } from './api'
import type { UserProfile } from './schema'
import { sortProfiles, UsersContext, type UsersContextValue } from './usersContext'

const allProfilesRef = profilesRef(db)

/**
 * Keeps the signed-in user's profile in step with their Google account and shares the profiles in real time.
 * Mounted once under `AuthProvider`. Signed out, it subscribes to nothing.
 */
export function UsersProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const user = auth.status === 'signedIn' ? auth.user : null
  const uid = user?.uid ?? null

  // Once per signed-in uid per app start. A failure (for example offline) is retried on the next start;
  // meanwhile the user counts as a player.
  const syncedUid = useRef<string | null>(null)
  useEffect(() => {
    if (!user || syncedUid.current === user.uid) return
    syncedUid.current = user.uid
    ensureProfile(db, user).catch((error: unknown) => {
      console.error('Could not sync the user profile', error)
    })
  }, [user])

  const currentProfile = useDocument(uid ? profileRef(db, uid) : null)
  const allProfiles = useCollection(uid ? allProfilesRef : null)

  const profiles = useMemo<Subscription<UserProfile[]>>(
    () =>
      allProfiles.status === 'ready'
        ? { ...allProfiles, data: sortProfiles(allProfiles.data) }
        : allProfiles,
    [allProfiles],
  )

  const value = useMemo<UsersContextValue>(
    () => ({ currentProfile, profiles }),
    [currentProfile, profiles],
  )

  return <UsersContext value={value}>{children}</UsersContext>
}

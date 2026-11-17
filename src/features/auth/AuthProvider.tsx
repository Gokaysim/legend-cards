import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { accessStatusOf, needsLink } from '@/features/access/accessStatus'
import { linkOwnEntry } from '@/features/access/api'
import { normalizeEmail } from '@/features/access/email'
import { useOwnAccessCheck } from '@/features/access/useOwnAccessCheck'
import { auth } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/firestore'

import { AuthContext, type AuthContextValue, type AuthState, type AuthUser } from './authContext'

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  }
}

async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  // Always show the account chooser, so a shared device can switch accounts.
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(auth, provider)
}

async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

/**
 * The Firebase Auth session alone, before the access list is asked. `emailVerified` stays out of `AuthUser`: only the
 * access check needs it (design D3 of retry-own-access-check).
 */
type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser; emailVerified: boolean }

/**
 * Tracks the Firebase Auth session and the account's own access-list entry, and provides the result through
 * `useAuth()` (design D4 and D5 of invite-only-sign-in). Only an account on the list is `signedIn`; the data
 * providers subscribe in that state alone, so an account that is not on the list, or is removed from it, reads no
 * table data. While signed in, an unlinked entry is linked to the account.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setSession(
          user
            ? { status: 'signedIn', user: toAuthUser(user), emailVerified: user.emailVerified }
            : { status: 'signedOut' },
        )
      }),
    [],
  )

  // Without a verified address the rules deny reading the own entry every time, so the app does not ask: the account
  // is not on the list (design D3 of retry-own-access-check).
  const user = session.status === 'signedIn' ? session.user : null
  const verified = session.status === 'signedIn' && session.emailVerified
  const email = user?.email && verified ? normalizeEmail(user.email) : null
  const { entry, failed, retry } = useOwnAccessCheck(email)

  // The state changes only when the access status does, not on every snapshot of the entry.
  const access = email ? (failed ? 'checkFailed' : accessStatusOf(entry)) : 'noAccess'
  const state = useMemo<AuthState>(() => {
    if (session.status !== 'signedIn') return session
    switch (access) {
      case 'checking':
        return { status: 'checking', user: session.user }
      case 'noAccess':
        return { status: 'noAccess', user: session.user }
      case 'checkFailed':
        return { status: 'checkFailed', user: session.user }
      case 'member':
        return { status: 'signedIn', user: session.user }
    }
  }, [session, access])

  // Links the entry at the first entry, and again after the DM removes and adds the address back while the app is
  // open. A failure (for example offline) is retried on the next unlinked state or the next start.
  const uid = state.status === 'signedIn' ? state.user.uid : null
  const shouldLink = uid !== null && email !== null && needsLink(entry)
  useEffect(() => {
    if (!shouldLink || uid === null || email === null) return
    linkOwnEntry(db, { uid, email }).catch((error: unknown) => {
      console.error('Could not link the access-list entry', error)
    })
  }, [shouldLink, uid, email])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInWithGoogle, signOut, retryAccessCheck: retry }),
    [state, retry],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

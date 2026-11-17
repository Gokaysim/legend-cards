import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { accessStatusOf, needsLink } from '@/features/access/accessStatus'
import type {
  AccessDiagnosis,
  AccessDiagnosisReason,
  ServerRead,
} from '@/features/access/accessDiagnosis'
import { linkOwnEntry, readEntryFromServer } from '@/features/access/api'
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

  // Why a signed-in account is not on the list, for the diagnostic line (design D1, D2 of diagnose-no-access). After a
  // "missing" answer from the subscription, the entry is read once straight from the server, as a cross-check.
  let reason: AccessDiagnosisReason | null = null
  if (session.status === 'signedIn' && access === 'noAccess') {
    if (!session.user.email) reason = 'noEmail'
    else if (!session.emailVerified) reason = 'unverified'
    else reason = 'serverMissing'
  }
  const [serverRead, setServerRead] = useState<{ email: string; read: ServerRead } | null>(null)
  const readFor = reason === 'serverMissing' ? email : null
  const alreadyRead = readFor !== null && serverRead?.email === readFor
  useEffect(() => {
    if (readFor === null || alreadyRead) return
    let active = true
    void readEntryFromServer(db, readFor).then((read) => {
      if (active) setServerRead({ email: readFor, read })
    })
    return () => {
      active = false
    }
  }, [readFor, alreadyRead])

  const diagnosis = useMemo<AccessDiagnosis | undefined>(() => {
    if (reason === null) return undefined
    const looksUp = reason === 'serverMissing' ? email : null
    return {
      reason,
      entryId: looksUp,
      serverRead:
        looksUp === null ? 'skipped' : serverRead?.email === looksUp ? serverRead.read : 'pending',
      buildId: __BUILD_ID__,
    }
  }, [reason, email, serverRead])

  const state = useMemo<AuthState>(() => {
    if (session.status !== 'signedIn') return session
    switch (access) {
      case 'checking':
        return { status: 'checking', user: session.user }
      case 'noAccess':
        return { status: 'noAccess', user: session.user, diagnosis }
      case 'checkFailed':
        return { status: 'checkFailed', user: session.user }
      case 'member':
        return { status: 'signedIn', user: session.user }
    }
  }, [session, access, diagnosis])

  // Every access decision, for diagnosing a wrong one (design D5 of diagnose-no-access).
  useEffect(() => {
    if (state.status === 'loading' || state.status === 'signedOut') return
    console.info('[access] decision', {
      status: state.status,
      diagnosis: state.status === 'noAccess' ? state.diagnosis : undefined,
    })
  }, [state])

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

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { auth } from '@/lib/firebase/auth'

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

/** Tracks the Firebase Auth session and provides it through `useAuth()`. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setState(user ? { status: 'signedIn', user: toAuthUser(user) } : { status: 'signedOut' })
      }),
    [],
  )

  const value = useMemo<AuthContextValue>(() => ({ ...state, signInWithGoogle, signOut }), [state])

  return <AuthContext value={value}>{children}</AuthContext>
}

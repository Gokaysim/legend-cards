import { createContext, useContext } from 'react'

import type { AccessDiagnosis } from '@/features/access/accessDiagnosis'

/** The signed-in user, as the app sees it. Kept free of Firebase types on purpose. */
export type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

/**
 * The session as the app sees it (spec: user-auth; design D4 of invite-only-sign-in):
 * - `loading`: Firebase Auth has not answered yet
 * - `signedOut`: nobody is signed in
 * - `checking`: signed in to Google, while the app finds out whether the account is on the access list
 * - `noAccess`: signed in to Google with an account that is not on the access list; the app reads no table data
 * - `checkFailed`: every try to check the access list failed (design D4 of retry-own-access-check); the app reads no
 *   table data
 * - `signedIn`: signed in with an account on the access list. Only this state lets the app read table data.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'checking'; user: AuthUser }
  | {
      status: 'noAccess'
      user: AuthUser
      /** Why the app decided so, for the diagnostic line (design D1 of diagnose-no-access). */
      diagnosis?: AccessDiagnosis
    }
  | { status: 'checkFailed'; user: AuthUser }
  | { status: 'signedIn'; user: AuthUser }

export type AuthActions = {
  /** Opens Google's account chooser in a popup. Rejects with the Firebase error if sign-in fails. */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Checks the access list again at once, after every try failed (`checkFailed`). */
  retryAccessCheck: () => void
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

/** The current auth state and actions. Must be used inside `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

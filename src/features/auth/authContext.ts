import { createContext, useContext } from 'react'

/** The signed-in user, as the app sees it. Kept free of Firebase types on purpose. */
export type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: AuthUser }

export type AuthActions = {
  /** Opens Google's account chooser in a popup. Rejects with the Firebase error if sign-in fails. */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

/** The current auth state and actions. Must be used inside `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

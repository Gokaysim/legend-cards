import type { ReactNode } from 'react'

import { AuthContext, type AuthState } from '@/features/auth/authContext'

export type TestAuthProviderProps = {
  state: AuthState
  signInWithGoogle?: () => Promise<void>
  signOut?: () => Promise<void>
  children: ReactNode
}

/** Provides a fixed auth state to components under test, without Firebase. */
export function TestAuthProvider({
  state,
  signInWithGoogle = () => Promise.resolve(),
  signOut = () => Promise.resolve(),
  children,
}: TestAuthProviderProps) {
  return <AuthContext value={{ ...state, signInWithGoogle, signOut }}>{children}</AuthContext>
}

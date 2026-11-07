import { act, render, renderHook, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from './authContext'
import { AuthProvider } from './AuthProvider'

const firebaseAuth = vi.hoisted(() => ({
  listener: null as ((user: User | null) => void) | null,
  unsubscribe: vi.fn(),
  signInWithPopup: vi.fn((_auth: unknown, _provider: unknown) => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/firebase/auth', () => ({ auth: { name: 'test-auth' } }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn()
  },
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    firebaseAuth.listener = listener
    return firebaseAuth.unsubscribe
  },
  signInWithPopup: firebaseAuth.signInWithPopup,
  signOut: firebaseAuth.signOut,
}))

function emitUser(user: Partial<User> | null) {
  act(() => {
    firebaseAuth.listener?.(user as User | null)
  })
}

function StatusProbe() {
  const auth = useAuth()
  return <p>{auth.status === 'signedIn' ? `signedIn:${auth.user.displayName}` : auth.status}</p>
}

beforeEach(() => {
  firebaseAuth.listener = null
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('starts loading, then reports signed out', () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    )
    expect(screen.getByText('loading')).toBeInTheDocument()

    emitUser(null)
    expect(screen.getByText('signedOut')).toBeInTheDocument()
  })

  it('reports a signed-in user without Firebase types', () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    )

    emitUser({ uid: 'u1', displayName: 'Gökay', email: 'g@example.com', photoURL: null })
    expect(screen.getByText('signedIn:Gökay')).toBeInTheDocument()
  })

  it('signs in with a Google popup and signs out through the SDK', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(() => result.current.signInWithGoogle())
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1)
    const [usedAuth, provider] = firebaseAuth.signInWithPopup.mock.calls[0] ?? []
    expect(usedAuth).toEqual({ name: 'test-auth' })
    expect(
      (provider as { setCustomParameters: ReturnType<typeof vi.fn> }).setCustomParameters,
    ).toHaveBeenCalledWith({
      prompt: 'select_account',
    })

    await act(() => result.current.signOut())
    expect(firebaseAuth.signOut).toHaveBeenCalledWith({ name: 'test-auth' })
  })

  it('stops listening when unmounted', () => {
    const { unmount } = render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    )

    unmount()
    expect(firebaseAuth.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('makes useAuth throw outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(/inside <AuthProvider>/)
  })
})

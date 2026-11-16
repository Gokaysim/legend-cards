import { act, render, renderHook, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccessEntry } from '@/features/access/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { useAuth } from './authContext'
import { AuthProvider } from './AuthProvider'

const firebaseAuth = vi.hoisted(() => ({
  listener: null as ((user: User | null) => void) | null,
  unsubscribe: vi.fn(),
  signInWithPopup: vi.fn((_auth: unknown, _provider: unknown) => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
}))

/** The own access-list entry as a small store, so a test can change it live, as the DM does. */
const access = vi.hoisted(() => {
  let entry: unknown = { status: 'loading' }
  const listeners = new Set<() => void>()
  return {
    get: () => entry,
    set: (next: unknown) => {
      entry = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emails: [] as (string | null)[],
    linkOwnEntry: vi.fn((_db: unknown, _user: { uid: string; email: string }) =>
      Promise.resolve('linked' as const),
    ),
  }
})

vi.mock('@/lib/firebase/auth', () => ({ auth: { name: 'test-auth' } }))
vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
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
vi.mock('@/features/access/api', () => ({ linkOwnEntry: access.linkOwnEntry }))
vi.mock('@/features/access/useOwnAccessEntry', async () => {
  const { useSyncExternalStore } = await import('react')
  return {
    useOwnAccessEntry: (email: string | null) => {
      access.emails.push(email)
      const entry = useSyncExternalStore(access.subscribe, access.get)
      return email
        ? entry
        : { status: 'ready', data: null, fromCache: false, hasPendingWrites: false }
    },
  }
})

const GOKAY = { uid: 'u1', displayName: 'Gökay', email: 'Gokay@Example.com', photoURL: null }

function emitUser(user: Partial<User> | null) {
  act(() => {
    firebaseAuth.listener?.(user as User | null)
  })
}

function setEntry(entry: Subscription<AccessEntry | null>) {
  act(() => {
    access.set(entry)
  })
}

const entry = (uid?: string): AccessEntry => ({
  email: 'gokay@example.com',
  addedAt: Timestamp.fromMillis(0),
  ...(uid ? { uid } : {}),
})

const fromServer = (data: AccessEntry | null): Subscription<AccessEntry | null> => ({
  status: 'ready',
  data,
  fromCache: false,
  hasPendingWrites: false,
})

function StatusProbe() {
  const auth = useAuth()
  return (
    <p>
      {auth.status === 'loading' || auth.status === 'signedOut'
        ? auth.status
        : `${auth.status}:${auth.user.displayName}`}
    </p>
  )
}

function renderProbe() {
  return render(
    <AuthProvider>
      <StatusProbe />
    </AuthProvider>,
  )
}

beforeEach(() => {
  firebaseAuth.listener = null
  access.set({ status: 'loading' })
  access.emails.length = 0
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('starts loading, then reports signed out', () => {
    renderProbe()
    expect(screen.getByText('loading')).toBeInTheDocument()

    emitUser(null)
    expect(screen.getByText('signedOut')).toBeInTheDocument()
  })

  it('reports a signed-in member without Firebase types', () => {
    renderProbe()
    setEntry(fromServer(entry('u1')))

    emitUser(GOKAY)
    expect(screen.getByText('signedIn:Gökay')).toBeInTheDocument()
  })

  it('follows the entry of the account’s address in lowercase', () => {
    renderProbe()
    emitUser(GOKAY)
    expect(access.emails.at(-1)).toBe('gokay@example.com')
  })

  it('is checking until the access list answers, and while only the cache says there is no entry', () => {
    renderProbe()
    emitUser(GOKAY)
    expect(screen.getByText('checking:Gökay')).toBeInTheDocument()

    setEntry({ status: 'ready', data: null, fromCache: true, hasPendingWrites: false })
    expect(screen.getByText('checking:Gökay')).toBeInTheDocument()
  })

  it('has no access when the server says there is no entry, or the account has no address', () => {
    renderProbe()
    emitUser(GOKAY)
    setEntry(fromServer(null))
    expect(screen.getByText('noAccess:Gökay')).toBeInTheDocument()

    emitUser({ ...GOKAY, email: null })
    expect(screen.getByText('noAccess:Gökay')).toBeInTheDocument()
  })

  it('lets the account in when the DM adds the address, and out when the DM removes it', () => {
    renderProbe()
    emitUser(GOKAY)
    setEntry(fromServer(null))
    expect(screen.getByText('noAccess:Gökay')).toBeInTheDocument()

    setEntry(fromServer(entry('u1')))
    expect(screen.getByText('signedIn:Gökay')).toBeInTheDocument()

    setEntry(fromServer(null))
    expect(screen.getByText('noAccess:Gökay')).toBeInTheDocument()
  })

  describe('linking the entry', () => {
    it('links an unlinked entry once, with the normalized address', () => {
      renderProbe()
      emitUser(GOKAY)
      setEntry(fromServer(entry()))

      expect(access.linkOwnEntry).toHaveBeenCalledTimes(1)
      expect(access.linkOwnEntry).toHaveBeenCalledWith(
        { name: 'test-db' },
        { uid: 'u1', email: 'gokay@example.com' },
      )

      setEntry(fromServer(entry('u1')))
      expect(access.linkOwnEntry).toHaveBeenCalledTimes(1)
    })

    it('writes nothing for a linked entry, or without access', () => {
      renderProbe()
      emitUser(GOKAY)
      setEntry(fromServer(entry('u1')))
      setEntry(fromServer(null))
      expect(access.linkOwnEntry).not.toHaveBeenCalled()
    })

    it('links again when the DM removes the address and adds it back while the app is open', () => {
      renderProbe()
      emitUser(GOKAY)
      setEntry(fromServer(entry()))
      setEntry(fromServer(entry('u1')))
      setEntry(fromServer(null))
      setEntry(fromServer(entry()))
      expect(access.linkOwnEntry).toHaveBeenCalledTimes(2)
    })

    it('logs a failed link instead of throwing', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      access.linkOwnEntry.mockRejectedValueOnce(new Error('offline'))
      renderProbe()
      emitUser(GOKAY)
      setEntry(fromServer(entry()))
      await vi.waitFor(() => {
        expect(error).toHaveBeenCalledWith(
          'Could not link the access-list entry',
          expect.any(Error),
        )
      })
    })
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
    const { unmount } = renderProbe()

    unmount()
    expect(firebaseAuth.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('makes useAuth throw outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(/inside <AuthProvider>/)
  })
})

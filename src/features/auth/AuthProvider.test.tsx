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
    /** What the hook reports as `failed`. */
    failed: false,
    retry: vi.fn(),
    linkOwnEntry: vi.fn((_db: unknown, _user: { uid: string; email: string }) =>
      Promise.resolve('linked' as const),
    ),
    readEntryFromServer: vi.fn((_email: string) => Promise.resolve('exists' as string)),
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
vi.mock('@/features/access/api', () => ({
  linkOwnEntry: access.linkOwnEntry,
  readEntryFromServer: access.readEntryFromServer,
}))
vi.mock('@/features/access/useOwnAccessCheck', async () => {
  const { useSyncExternalStore } = await import('react')
  return {
    useOwnAccessCheck: (email: string | null) => {
      access.emails.push(email)
      const entry = useSyncExternalStore(access.subscribe, access.get)
      return email
        ? { entry, failed: access.failed, retry: access.retry }
        : {
            entry: { status: 'ready', data: null, fromCache: false, hasPendingWrites: false },
            failed: false,
            retry: access.retry,
          }
    },
  }
})

const GOKAY = {
  uid: 'u1',
  displayName: 'Gökay',
  email: 'Gokay@Example.com',
  emailVerified: true,
  photoURL: null,
}

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
  access.failed = false
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

  it('carries the own entry while signed in, and follows it (design D3 of drop-persistent-cache-and-dm-own-entry-query)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    setEntry(fromServer(entry()))
    emitUser(GOKAY)
    expect(result.current).toMatchObject({ status: 'signedIn', ownEntry: entry() })

    // A snapshot that changes only metadata keeps the same entry object, so the state does not change.
    const before = result.current.status === 'signedIn' ? result.current.ownEntry : null
    setEntry({ status: 'ready', data: entry(), fromCache: true, hasPendingWrites: false })
    expect(result.current.status === 'signedIn' && result.current.ownEntry).toBe(before)

    // Linking the entry to the account shows in the state.
    setEntry(fromServer(entry('u1')))
    expect(result.current).toMatchObject({ status: 'signedIn', ownEntry: entry('u1') })
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

  it('does not follow the entry of an account without a verified address, and has no access', () => {
    renderProbe()
    emitUser({ ...GOKAY, emailVerified: false })

    expect(access.emails.at(-1)).toBeNull()
    expect(screen.getByText('noAccess:Gökay')).toBeInTheDocument()
  })

  it('reports a failed check as checkFailed, never as noAccess (retry-own-access-check)', () => {
    access.failed = true
    renderProbe()
    emitUser(GOKAY)

    expect(screen.getByText('checkFailed:Gökay')).toBeInTheDocument()
  })

  it('checks the access list again through retryAccessCheck', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    act(() => {
      result.current.retryAccessCheck()
    })

    expect(access.retry).toHaveBeenCalledTimes(1)
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

    it('writes nothing while the check has failed', () => {
      access.failed = true
      renderProbe()
      emitUser(GOKAY)
      setEntry(fromServer(entry()))
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

  // Spec: user-auth, "Diagnosing the 'ekli değil' decision" (diagnose-no-access).
  describe('diagnosing "ekli değil"', () => {
    function DiagnosisProbe() {
      const auth = useAuth()
      return <p>{auth.status === 'noAccess' ? JSON.stringify(auth.diagnosis) : auth.status}</p>
    }

    function renderDiagnosis() {
      return render(
        <AuthProvider>
          <DiagnosisProbe />
        </AuthProvider>,
      )
    }

    const diagnosisShown = () => JSON.parse(screen.getByRole('paragraph').textContent) as unknown

    beforeEach(() => {
      vi.spyOn(console, 'info').mockImplementation(() => {})
    })

    it('reads the entry once from the server after a "missing" answer, and shows the result', async () => {
      access.readEntryFromServer.mockResolvedValueOnce('exists')
      const { rerender } = renderDiagnosis()
      emitUser(GOKAY)
      setEntry(fromServer(null))

      expect(diagnosisShown()).toEqual({
        reason: 'serverMissing',
        entryId: 'gokay@example.com',
        serverRead: 'pending',
        buildId: __BUILD_ID__,
      })
      await vi.waitFor(() => {
        expect(diagnosisShown()).toMatchObject({ serverRead: 'exists' })
      })

      rerender(
        <AuthProvider>
          <DiagnosisProbe />
        </AuthProvider>,
      )
      setEntry(fromServer(null))
      expect(access.readEntryFromServer).toHaveBeenCalledTimes(1)
      expect(access.readEntryFromServer).toHaveBeenCalledWith('gokay@example.com')
    })

    it('makes no read for an account without a verified address, or without an address', () => {
      renderDiagnosis()
      emitUser({ ...GOKAY, emailVerified: false })
      expect(diagnosisShown()).toEqual({
        reason: 'unverified',
        entryId: null,
        serverRead: 'skipped',
        buildId: __BUILD_ID__,
      })

      emitUser({ ...GOKAY, email: null })
      expect(diagnosisShown()).toMatchObject({ reason: 'noEmail', serverRead: 'skipped' })
      expect(access.readEntryFromServer).not.toHaveBeenCalled()
    })

    it('logs each decision', () => {
      renderDiagnosis()
      emitUser(GOKAY)
      setEntry(fromServer(entry('u1')))

      expect(console.info).toHaveBeenCalledWith('[access] decision', {
        status: 'checking',
        diagnosis: undefined,
      })
      expect(console.info).toHaveBeenCalledWith('[access] decision', {
        status: 'signedIn',
        diagnosis: undefined,
      })
    })
  })
})

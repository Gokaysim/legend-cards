import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@/features/auth/authContext'
import { testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'

import { UsersProvider } from './UsersProvider'

const users = vi.hoisted(() => ({
  ensureProfile: vi.fn((_db: unknown, _user: unknown) => Promise.resolve('created' as const)),
  subscribed: [] as unknown[],
}))

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', () => ({
  ensureProfile: users.ensureProfile,
  profileRef: (_db: unknown, uid: string) => ({ path: `users/${uid}` }),
  profilesRef: () => ({ path: 'users' }),
}))
vi.mock('@/lib/firestore/useDocument', () => ({
  useDocument: (ref: unknown) => {
    users.subscribed.push(ref)
    return { status: 'loading' }
  },
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (ref: unknown) => {
    users.subscribed.push(ref)
    return { status: 'loading' }
  },
}))

function renderWith(state: AuthState) {
  return render(
    <TestAuthProvider state={state}>
      <UsersProvider>
        <p>app</p>
      </UsersProvider>
    </TestAuthProvider>,
  )
}

beforeEach(() => {
  users.subscribed.length = 0
  vi.clearAllMocks()
})

// Spec: user-profiles, "Player profile at first sign-in"; user-auth, "The 'ekli değil' screen".
describe('UsersProvider', () => {
  it('makes sure a signed-in member has a profile, and follows the profiles', () => {
    renderWith({ status: 'signedIn', user: testUser })
    expect(users.ensureProfile).toHaveBeenCalledTimes(1)
    expect(users.subscribed.filter(Boolean)).not.toHaveLength(0)
  })

  it.each([
    { status: 'checking', user: testUser },
    { status: 'noAccess', user: testUser },
  ] as const)('writes no profile and reads no profiles while $status', (state) => {
    renderWith(state)
    expect(users.ensureProfile).not.toHaveBeenCalled()
    expect(users.subscribed.filter(Boolean)).toHaveLength(0)
  })
})

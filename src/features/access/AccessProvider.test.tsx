import { render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import type { Subscription } from '@/lib/firestore/subscription'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { useAccessList } from './accessContext'
import { AccessProvider } from './AccessProvider'
import type { AccessEntry } from './schema'

const access = vi.hoisted(() => {
  // A function's declared return type keeps the whole union, so a test can set any answer.
  const loading = (): Subscription<AccessEntry[]> => ({ status: 'loading' })
  return {
    subscribed: [] as unknown[],
    /** What the list query answers. */
    answer: loading(),
    addEmail: vi.fn((_db: unknown, _email: string) => Promise.resolve()),
    removeEmail: vi.fn((_db: unknown, _email: string) => Promise.resolve()),
  }
})

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', () => ({
  accessEntriesExceptRef: (_db: unknown, email: string) => ({
    path: 'allowedEmails',
    except: email,
  }),
  addEmail: access.addEmail,
  removeEmail: access.removeEmail,
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (ref: unknown) => {
    access.subscribed.push(ref)
    return ref ? access.answer : ready([])
  },
}))

const ME = { ...testUser, email: 'dm@example.com' }
const OWN_ENTRY = signedInAs(ME).ownEntry
const BORA: AccessEntry = { email: 'bora@example.com', addedAt: null }

function wrapperFor(role: 'dm' | 'player') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestAuthProvider state={signedInAs(ME)}>
        <TestUsersProvider currentProfile={ready(testProfile({ role }))}>
          <AccessProvider>{children}</AccessProvider>
        </TestUsersProvider>
      </TestAuthProvider>
    )
  }
}

beforeEach(() => {
  access.subscribed.length = 0
  access.answer = { status: 'loading' }
  vi.clearAllMocks()
})

// Spec: table-access, "Only the DM manages the list"; design D6 of invite-only-sign-in.
describe('AccessProvider', () => {
  it('reads the list on the DM’s device, without the DM’s own entry', () => {
    renderHook(() => useAccessList(), { wrapper: wrapperFor('dm') })
    expect(access.subscribed).toContainEqual({ path: 'allowedEmails', except: 'dm@example.com' })
  })

  // Design D3 of drop-persistent-cache-and-dm-own-entry-query.
  it('adds the DM’s own entry from the access check, exactly once, once the list is ready', () => {
    const { result, rerender } = renderHook(() => useAccessList(), { wrapper: wrapperFor('dm') })
    expect(result.current.entries).toEqual({ status: 'loading' })

    access.answer = ready([BORA])
    rerender()
    expect(result.current.entries).toEqual(ready([OWN_ENTRY, BORA]))
    if (result.current.entries.status !== 'ready') throw new Error('not ready')
    expect(
      result.current.entries.data.filter((entry) => entry.email === 'dm@example.com'),
    ).toHaveLength(1)
  })

  it('passes an error of the list on', () => {
    access.answer = {
      status: 'error',
      error: { kind: 'permission-denied', message: 'denied', path: 'allowedEmails' },
    }
    const { result } = renderHook(() => useAccessList(), { wrapper: wrapperFor('dm') })
    expect(result.current.entries).toEqual(access.answer)
  })

  it('never reads the list on a player’s device', () => {
    const { result } = renderHook(() => useAccessList(), { wrapper: wrapperFor('player') })
    expect(access.subscribed.every((ref) => ref === null)).toBe(true)
    expect(result.current.entries).toEqual(ready([]))
  })

  it('adds and removes through the app’s Firestore', async () => {
    const { result } = renderHook(() => useAccessList(), { wrapper: wrapperFor('dm') })
    await result.current.actions.add('cem@example.com')
    await result.current.actions.remove('bora@example.com')
    expect(access.addEmail).toHaveBeenCalledWith({ name: 'test-db' }, 'cem@example.com')
    expect(access.removeEmail).toHaveBeenCalledWith({ name: 'test-db' }, 'bora@example.com')
  })

  it('makes useAccessList throw outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/inside <AccessProvider>/)
  })
})

function Probe() {
  useAccessList()
  return null
}

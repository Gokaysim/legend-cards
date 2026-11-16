import { render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ready, testProfile } from '@/test/fixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { useAccessList } from './accessContext'
import { AccessProvider } from './AccessProvider'

const access = vi.hoisted(() => ({
  subscribed: [] as unknown[],
  addEmail: vi.fn((_db: unknown, _email: string) => Promise.resolve()),
  removeEmail: vi.fn((_db: unknown, _email: string) => Promise.resolve()),
}))

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', () => ({
  accessEntriesRef: () => ({ path: 'allowedEmails' }),
  addEmail: access.addEmail,
  removeEmail: access.removeEmail,
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (ref: unknown) => {
    access.subscribed.push(ref)
    return ref ? { status: 'loading' } : ready([])
  },
}))

function wrapperFor(role: 'dm' | 'player') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestUsersProvider currentProfile={ready(testProfile({ role }))}>
        <AccessProvider>{children}</AccessProvider>
      </TestUsersProvider>
    )
  }
}

beforeEach(() => {
  access.subscribed.length = 0
  vi.clearAllMocks()
})

// Spec: table-access, "Only the DM manages the list"; design D6 of invite-only-sign-in.
describe('AccessProvider', () => {
  it('reads the list on the DM’s device', () => {
    renderHook(() => useAccessList(), { wrapper: wrapperFor('dm') })
    expect(access.subscribed).toContainEqual({ path: 'allowedEmails' })
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

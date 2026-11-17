import { act, renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Subscription } from '@/lib/firestore/subscription'

import type { AccessEntry } from './schema'
import { RETRY_WAITS_MS, useOwnAccessCheck } from './useOwnAccessCheck'

// Spec: user-auth, "Retrying a failed access check" and "Access check failure screen" (design D1 of
// retry-own-access-check).

/** Each subscription the hook starts, by ref path and key, as a small store a test answers. */
const firestore = vi.hoisted(() => {
  const states = new Map<string, unknown>()
  const listeners = new Set<() => void>()
  return {
    calls: [] as string[],
    states,
    answer(id: string, state: unknown) {
      states.set(id, state)
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
})

const getIdToken = vi.hoisted(() => vi.fn((_force?: boolean) => Promise.resolve('token')))

vi.mock('@/lib/firebase/auth', () => ({ auth: { currentUser: { getIdToken } } }))
vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', () => ({
  accessEntryRef: (_db: unknown, email: string) => ({ path: `allowedEmails/${email}` }),
}))
vi.mock('@/lib/firestore/useDocument', async () => {
  const { useEffect, useSyncExternalStore } = await import('react')
  return {
    useDocument: (ref: { path: string } | null, key?: number) => {
      const id = ref ? `${ref.path}#${String(key ?? 0)}` : 'none'
      useEffect(() => {
        firestore.calls.push(id)
      }, [id])
      const state = useSyncExternalStore(firestore.subscribe, () => firestore.states.get(id))
      if (!ref) return { status: 'ready', data: null, fromCache: false, hasPendingWrites: false }
      return state ?? { status: 'loading' }
    },
  }
})

const ENTRY: AccessEntry = {
  email: 'ayla@gmail.com',
  addedAt: Timestamp.fromMillis(0),
  uid: 'u1',
}
const DENIED: Subscription<AccessEntry | null> = {
  status: 'error',
  error: {
    kind: 'permission-denied',
    message: 'Null value error.',
    path: 'allowedEmails/ayla@gmail.com',
  },
}

function fromServer(data: AccessEntry | null): Subscription<AccessEntry | null> {
  return { status: 'ready', data, fromCache: false, hasPendingWrites: false }
}

function answer(key: number, state: Subscription<AccessEntry | null>, email = 'ayla@gmail.com') {
  act(() => {
    firestore.answer(`allowedEmails/${email}#${String(key)}`, state)
  })
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** Fails the tries from `fromKey` on, waiting out each retry, and returns the key of the last try. */
async function failEveryTry(fromKey = 0) {
  answer(fromKey, DENIED)
  for (const [index, ms] of RETRY_WAITS_MS.entries()) {
    await wait(ms)
    answer(fromKey + index + 1, DENIED)
  }
  return fromKey + RETRY_WAITS_MS.length
}

describe('useOwnAccessCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    firestore.calls = []
    firestore.states.clear()
    getIdToken.mockClear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries a failed first read with a fresh token, and lets the member in without failing', async () => {
    const { result } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, DENIED)

    expect(result.current.entry).toEqual({ status: 'loading' })
    expect(result.current.failed).toBe(false)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Null value error.'))

    await wait(RETRY_WAITS_MS[0] - 1)
    expect(getIdToken).not.toHaveBeenCalled()
    await wait(1)

    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(firestore.calls).toEqual([
      'allowedEmails/ayla@gmail.com#0',
      'allowedEmails/ayla@gmail.com#1',
    ])

    answer(1, fromServer(ENTRY))
    expect(result.current.entry).toEqual(fromServer(ENTRY))
    expect(result.current.failed).toBe(false)
  })

  it('gives up after five failed tries, about 7.5 s after the first', async () => {
    const { result } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, DENIED)
    for (const [index, ms] of RETRY_WAITS_MS.entries()) {
      expect(result.current.failed).toBe(false)
      await wait(ms)
      answer(index + 1, DENIED)
    }

    expect(result.current.failed).toBe(true)
    expect(result.current.entry).toEqual({ status: 'loading' })
    expect(getIdToken).toHaveBeenCalledTimes(4)
    expect(firestore.calls).toHaveLength(5)
    expect(console.error).toHaveBeenCalledTimes(1)

    await wait(60_000)
    expect(firestore.calls).toHaveLength(5)
  })

  it("keeps a member's last answer while it retries", async () => {
    const { result } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, fromServer(ENTRY))
    answer(0, DENIED)

    expect(result.current.entry).toEqual(fromServer(ENTRY))
    await wait(RETRY_WAITS_MS[0])
    expect(result.current.entry).toEqual(fromServer(ENTRY))

    answer(1, fromServer(ENTRY))
    expect(result.current.entry).toEqual(fromServer(ENTRY))
    expect(result.current.failed).toBe(false)
  })

  it('starts a full set of retries after an answer from the server', async () => {
    const { result } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, DENIED)
    await wait(RETRY_WAITS_MS[0])
    answer(1, fromServer(ENTRY))

    const last = await failEveryTry(1)

    expect(last).toBe(5)
    expect(result.current.failed).toBe(true)
  })

  it('tries again at once on retry(), with a fresh token and a full set of retries', async () => {
    const { result } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    const last = await failEveryTry()
    getIdToken.mockClear()

    act(() => {
      result.current.retry()
    })
    expect(result.current.failed).toBe(false)
    expect(result.current.entry).toEqual({ status: 'loading' })

    await wait(0)
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(firestore.calls.at(-1)).toBe(`allowedEmails/ayla@gmail.com#${String(last + 1)}`)

    answer(last + 1, DENIED)
    expect(result.current.failed).toBe(false)
    await wait(RETRY_WAITS_MS[0])
    expect(firestore.calls.at(-1)).toBe(`allowedEmails/ayla@gmail.com#${String(last + 2)}`)

    answer(last + 2, fromServer(ENTRY))
    expect(result.current.entry).toEqual(fromServer(ENTRY))
  })

  it('cancels a pending retry when the account changes, and starts over for the new one', async () => {
    const { result, rerender } = renderHook(
      ({ email }: { email: string | null }) => useOwnAccessCheck(email),
      { initialProps: { email: 'ayla@gmail.com' } },
    )
    answer(0, DENIED)

    rerender({ email: 'cem@gmail.com' })
    await wait(60_000)

    expect(getIdToken).not.toHaveBeenCalled()
    expect(firestore.calls).toEqual([
      'allowedEmails/ayla@gmail.com#0',
      'allowedEmails/cem@gmail.com#0',
    ])
    expect(result.current.entry).toEqual({ status: 'loading' })

    answer(0, fromServer(null), 'cem@gmail.com')
    expect(result.current.entry).toEqual(fromServer(null))
  })

  it('cancels a pending retry on unmount', async () => {
    const { unmount } = renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, DENIED)

    unmount()
    await wait(60_000)

    expect(getIdToken).not.toHaveBeenCalled()
  })

  it('logs every answer about the entry (diagnose-no-access)', () => {
    renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, { status: 'ready', data: null, fromCache: true, hasPendingWrites: false })
    answer(0, fromServer(ENTRY))

    expect(console.info).toHaveBeenCalledWith('[access] answer', {
      entryId: 'ayla@gmail.com',
      status: 'ready',
      fromCache: true,
      hasPendingWrites: false,
      exists: false,
    })
    expect(console.info).toHaveBeenCalledWith('[access] answer', {
      entryId: 'ayla@gmail.com',
      status: 'ready',
      fromCache: false,
      hasPendingWrites: false,
      exists: true,
    })
  })

  it('retries even when the token refresh fails', async () => {
    getIdToken.mockRejectedValueOnce(new Error('network'))
    renderHook(() => useOwnAccessCheck('ayla@gmail.com'))
    answer(0, DENIED)

    await wait(RETRY_WAITS_MS[0])

    expect(firestore.calls.at(-1)).toBe('allowedEmails/ayla@gmail.com#1')
  })
})

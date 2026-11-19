import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Timestamp } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@/features/auth/authContext'
import type { Subscription } from '@/lib/firestore/subscription'
import { ready, signedInAs, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'

import {
  LEAVE_LIMIT_MS,
  type PresenceActions,
  usePresence,
  usePresenceActions,
} from './presenceContext'
import { PresenceProvider } from './PresenceProvider'
import type { Presence } from './schema'
import { BEAT_THROTTLE_MS, HEARTBEAT_MS, LOOK_WINDOW_MS, ONLINE_WINDOW_MS } from './timing'

const presence = vi.hoisted(() => {
  // A function result, so the type stays the whole union instead of narrowing to `loading`.
  const loading = (): Subscription<Presence[]> => ({ status: 'loading' })
  return {
    beat: vi.fn((_db: unknown, _uid: string) => Promise.resolve()),
    removePresence: vi.fn((_db: unknown, _uid: string) => Promise.resolve()),
    records: loading(),
    subscribed: [] as unknown[],
  }
})

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', () => ({
  beat: presence.beat,
  removePresence: presence.removePresence,
  presenceCollectionRef: () => ({ path: 'presence' }),
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (ref: unknown) => {
    presence.subscribed.push(ref)
    return ref === null ? ready([]) : presence.records
  },
}))

let visibility: DocumentVisibilityState = 'visible'

type Seen = { online: Subscription<ReadonlySet<string>>; actions: PresenceActions }

function renderWith(state: AuthState = signedInAs(testUser)) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestAuthProvider state={state}>
      <PresenceProvider>{children}</PresenceProvider>
    </TestAuthProvider>
  )
  return renderHook((): Seen => ({ online: usePresence(), actions: usePresenceActions() }), {
    wrapper,
  })
}

function setVisibility(next: DocumentVisibilityState) {
  visibility = next
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

const beats = () => presence.beat.mock.calls.length

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  presence.records = { status: 'loading' }
  presence.subscribed.length = 0
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

afterEach(() => {
  vi.useRealTimers()
})

// Spec: player-presence.
describe('PresenceProvider reporting', () => {
  it('reports at once for a signed-in member, then every two minutes while on screen', () => {
    renderWith()
    expect(presence.beat).toHaveBeenCalledWith({ name: 'test-db' }, testUser.uid)
    expect(beats()).toBe(1)
    advance(HEARTBEAT_MS)
    expect(beats()).toBe(2)
    advance(10 * HEARTBEAT_MS)
    expect(beats()).toBe(12)
  })

  it.each([
    { status: 'signedOut' },
    { status: 'checking', user: testUser },
    { status: 'noAccess', user: testUser },
  ] as AuthState[])('reports and reads nothing while $status', (state) => {
    renderWith(state)
    advance(HEARTBEAT_MS)
    expect(beats()).toBe(0)
    expect(presence.subscribed.filter(Boolean)).toHaveLength(0)
  })

  it('goes on reporting off screen for an hour after the last look, then stops', () => {
    renderWith()
    advance(30 * 1000)
    setVisibility('hidden')
    const atHide = beats()
    advance(LOOK_WINDOW_MS - HEARTBEAT_MS)
    expect(beats()).toBe(atHide + 29)
    advance(3 * HEARTBEAT_MS)
    const afterHour = beats()
    advance(10 * HEARTBEAT_MS)
    expect(beats()).toBe(afterHour)
  })

  it('reports at once when the tab comes back on screen, and starts the hour again', () => {
    renderWith()
    setVisibility('hidden')
    advance(2 * LOOK_WINDOW_MS)
    const before = beats()
    setVisibility('visible')
    expect(beats()).toBe(before + 1)
  })

  it('does not report twice within the throttle when the tab flips quickly', () => {
    renderWith()
    setVisibility('hidden')
    setVisibility('visible')
    expect(beats()).toBe(1)
    advance(BEAT_THROTTLE_MS)
    setVisibility('hidden')
    setVisibility('visible')
    expect(beats()).toBe(2)
  })

  it('reports again when its own record goes missing from the server snapshot', () => {
    presence.records = ready([{ uid: testUser.uid, lastSeen: Timestamp.now() }])
    const view = renderWith()
    advance(BEAT_THROTTLE_MS)
    presence.records = ready([])
    view.rerender()
    expect(beats()).toBe(2)
  })

  it('removes the record and stops when the tab closes, and comes back from the back-forward cache', () => {
    renderWith()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(presence.removePresence).toHaveBeenCalledWith({ name: 'test-db' }, testUser.uid)
    advance(5 * HEARTBEAT_MS)
    setVisibility('visible')
    expect(beats()).toBe(1)

    const restored = new Event('pageshow') as PageTransitionEvent
    Object.defineProperty(restored, 'persisted', { value: true })
    act(() => {
      window.dispatchEvent(restored)
    })
    expect(beats()).toBe(2)
  })
})

describe('PresenceProvider leave', () => {
  it('removes the record and never reports again, even when the record goes missing', async () => {
    const { result } = renderWith()
    await act(async () => {
      await result.current.actions.leave()
    })
    expect(presence.removePresence).toHaveBeenCalledTimes(1)
    advance(5 * HEARTBEAT_MS)
    setVisibility('visible')
    expect(beats()).toBe(1)
  })

  it('gives up waiting after two seconds when the removal hangs', async () => {
    presence.removePresence.mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderWith()
    let done = false
    void result.current.actions.leave().then(() => {
      done = true
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LEAVE_LIMIT_MS - 1)
    })
    expect(done).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(done).toBe(true)
  })

  it('resolves when the removal fails', async () => {
    presence.removePresence.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderWith()
    await act(async () => {
      await expect(result.current.actions.leave()).resolves.toBeUndefined()
    })
  })
})

describe('PresenceProvider online', () => {
  it('is loading until the records arrive', () => {
    const { result } = renderWith()
    expect(result.current.online.status).toBe('loading')
  })

  it('counts fresh reports and the user themself as online, and turns a silent user offline as time passes', () => {
    const now = Date.now()
    presence.records = ready([
      { uid: testUser.uid, lastSeen: Timestamp.fromMillis(now) },
      { uid: 'ayla', lastSeen: Timestamp.fromMillis(now - 60 * 1000) },
      { uid: 'bora', lastSeen: Timestamp.fromMillis(now - ONLINE_WINDOW_MS - 1) },
    ])
    const { result } = renderWith()
    const onlineNow = () => {
      const online = result.current.online
      return online.status === 'ready' ? [...online.data].sort() : null
    }
    expect(onlineNow()).toEqual(['ayla', testUser.uid].sort())
    advance(ONLINE_WINDOW_MS)
    expect(onlineNow()).toEqual([testUser.uid])
  })
})

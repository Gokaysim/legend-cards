// @vitest-environment jsdom
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { act, renderHook, waitFor } from '@testing-library/react'
import { deleteApp, type FirebaseApp, initializeApp } from 'firebase/app'
import type * as FirestoreModule from 'firebase/firestore'
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  enableNetwork,
  type Firestore,
  initializeFirestore,
  memoryLocalCache,
  query,
  setDoc,
  terminate,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { z } from 'zod'

import { createConverter } from './converter'
import type { Subscription } from './subscription'
import { useCollection } from './useCollection'
import { useDocument } from './useDocument'

// Wrap onSnapshot so each test can check that cleanup really unsubscribes.
const unsubscribeSpies = vi.hoisted(() => [] as Mock<() => void>[])
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof FirestoreModule>()
  return {
    ...actual,
    onSnapshot: (...args: unknown[]) => {
      const unsubscribe = (actual.onSnapshot as (...a: unknown[]) => () => void)(...args)
      const spy = vi.fn(unsubscribe)
      unsubscribeSpies.push(spy)
      return spy
    },
  }
})

// A separate project with permissive test-only rules: the emulator keeps rules and data per project.
const PROJECT_ID = 'demo-realtime-test'
const TEST_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{document=**} {
      allow read, write: if true;
    }
  }
}`

const itemSchema = z.object({ name: z.string(), count: z.number().default(0) })
type Item = z.infer<typeof itemSchema>
const itemConverter = createConverter(itemSchema)

type Client = { app: FirebaseApp; db: Firestore }

function createClient(name: string): Client {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, name)
  const db = initializeFirestore(app, { localCache: memoryLocalCache() })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  return { app, db }
}

let testEnv: RulesTestEnvironment
let clientA: Client
let clientB: Client

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: TEST_RULES },
  })
  clientA = createClient('client-a')
  clientB = createClient('client-b')
})

afterAll(async () => {
  for (const client of [clientA, clientB]) {
    await terminate(client.db)
    await deleteApp(client.app)
  }
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

const itemRef = (client: Client, id: string) =>
  doc(client.db, 'items', id).withConverter(itemConverter)

describe('useDocument', () => {
  it('reports a missing document as ready with null data', async () => {
    const { result } = renderHook(() => useDocument(itemRef(clientA, 'missing')))

    expect(result.current.status).toBe('loading')
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        data: null,
        fromCache: false,
        hasPendingWrites: false,
      }),
    )
  })

  it('delivers a change made by another client without a reload', async () => {
    const { result } = renderHook(() => useDocument(itemRef(clientA, 'live')))
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', data: null }))

    await setDoc(doc(clientB.db, 'items/live'), { name: 'Aa-Uskh' })

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'ready',
        data: { name: 'Aa-Uskh', count: 0 },
      }),
    )
  })

  it('shows pending writes until the server confirms a local write', async () => {
    const states: Subscription<Item | null>[] = []
    const ref = itemRef(clientA, 'pending')
    const { result } = renderHook(() => {
      const state = useDocument(ref)
      states.push(state)
      return state
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let write: Promise<void> = Promise.resolve()
    act(() => {
      write = setDoc(ref, { name: 'local', count: 1 })
    })

    await waitFor(() =>
      expect(
        states.some((s) => s.status === 'ready' && s.data?.name === 'local' && s.hasPendingWrites),
      ).toBe(true),
    )
    await write
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'ready',
        data: { name: 'local' },
        hasPendingWrites: false,
      }),
    )
  })

  it('reports a malformed document as invalid-data naming its path', async () => {
    await setDoc(doc(clientB.db, 'items/bad'), { count: 'not a number' })

    const { result } = renderHook(() => useDocument(itemRef(clientA, 'bad')))

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'error',
        error: { kind: 'invalid-data', path: 'items/bad' },
      }),
    )
  })

  it('reports a denied path as permission-denied', async () => {
    const { result } = renderHook(() =>
      useDocument(doc(clientA.db, 'secrets/s1').withConverter(itemConverter)),
    )

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'error',
        error: { kind: 'permission-denied', path: 'secrets/s1' },
      }),
    )
  })

  it('unsubscribes when the component unmounts', async () => {
    const firstSpy = unsubscribeSpies.length
    const { result, unmount } = renderHook(() => useDocument(itemRef(clientA, 'unmount')))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const spy = unsubscribeSpies[firstSpy]
    expect(spy).toBeDefined()
    expect(spy).not.toHaveBeenCalled()

    unmount()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not resubscribe for a new but equal ref', async () => {
    const firstSpy = unsubscribeSpies.length
    const { result, rerender } = renderHook(() => useDocument(itemRef(clientA, 'stable')))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender()
    rerender()

    expect(unsubscribeSpies.length).toBe(firstSpy + 1)
    expect(unsubscribeSpies[firstSpy]).not.toHaveBeenCalled()
  })

  it('only delivers results for the new target after switching', async () => {
    await setDoc(doc(clientB.db, 'items/one'), { name: 'one' })
    await setDoc(doc(clientB.db, 'items/two'), { name: 'two' })

    const firstSpy = unsubscribeSpies.length
    const states: Subscription<Item | null>[] = []
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => {
        const state = useDocument(itemRef(clientA, id))
        states.push(state)
        return state
      },
      { initialProps: { id: 'one' } },
    )
    await waitFor(() => expect(result.current).toMatchObject({ data: { name: 'one' } }))

    const switchedAt = states.length
    rerender({ id: 'two' })
    await waitFor(() => expect(result.current).toMatchObject({ data: { name: 'two' } }))
    expect(unsubscribeSpies[firstSpy]).toHaveBeenCalledTimes(1)

    // A change to the old target must not leak into the new subscription.
    await setDoc(doc(clientB.db, 'items/one'), { name: 'one, changed' })
    await new Promise((resolve) => setTimeout(resolve, 500))

    const afterSwitch = states.slice(switchedAt)
    expect(afterSwitch.some((s) => s.status === 'ready' && s.data?.name.startsWith('one'))).toBe(
      false,
    )
    expect(result.current).toMatchObject({ data: { name: 'two' } })
  })
})

describe('useCollection', () => {
  it('delivers a document added by another client', async () => {
    const { result } = renderHook(() =>
      useCollection(query(collection(clientA.db, 'items').withConverter(itemConverter))),
    )
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', data: [] }))

    await addDoc(collection(clientB.db, 'items'), { name: 'Abdulsalabar', count: 2 })

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'ready',
        data: [{ name: 'Abdulsalabar', count: 2 }],
      }),
    )
  })

  it('fails the whole subscription when one document is malformed', async () => {
    await setDoc(doc(clientB.db, 'items/good'), { name: 'good' })
    await setDoc(doc(clientB.db, 'items/broken'), { name: 42 })

    const { result } = renderHook(() =>
      useCollection(query(collection(clientA.db, 'items').withConverter(itemConverter))),
    )

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'error',
        error: { kind: 'invalid-data', path: 'items/broken' },
      }),
    )
  })

  it('does not resubscribe for a new but equal query, and unsubscribes on unmount', async () => {
    const firstSpy = unsubscribeSpies.length
    const { result, rerender, unmount } = renderHook(() =>
      useCollection(query(collection(clientA.db, 'items').withConverter(itemConverter))),
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender()
    expect(unsubscribeSpies.length).toBe(firstSpy + 1)

    unmount()
    expect(unsubscribeSpies[firstSpy]).toHaveBeenCalledTimes(1)
  })
})

describe('offline tolerance', () => {
  it('keeps cached data readable offline and delivers a queued write when back online', async () => {
    await setDoc(doc(clientB.db, 'items/offline'), { name: 'before' })

    const { result: onA } = renderHook(() => useDocument(itemRef(clientA, 'offline')))
    const { result: onB } = renderHook(() => useDocument(itemRef(clientB, 'offline')))
    await waitFor(() =>
      expect(onA.current).toMatchObject({ data: { name: 'before' }, fromCache: false }),
    )

    try {
      await act(() => disableNetwork(clientA.db))

      // Reading while offline: still ready, now from the local cache.
      await waitFor(() =>
        expect(onA.current).toMatchObject({
          status: 'ready',
          data: { name: 'before' },
          fromCache: true,
        }),
      )

      // Writing while offline: visible locally as pending, not yet on the other client.
      let write: Promise<void> = Promise.resolve()
      act(() => {
        write = setDoc(itemRef(clientA, 'offline'), { name: 'queued', count: 2 })
      })
      await waitFor(() =>
        expect(onA.current).toMatchObject({ data: { name: 'queued' }, hasPendingWrites: true }),
      )
      expect(onB.current).toMatchObject({ data: { name: 'before' } })

      // Back online: the queued write reaches the server and the other client without user action.
      await act(() => enableNetwork(clientA.db))
      await write
      await waitFor(() =>
        expect(onB.current).toMatchObject({ status: 'ready', data: { name: 'queued', count: 2 } }),
      )
    } finally {
      await enableNetwork(clientA.db)
    }
  })
})

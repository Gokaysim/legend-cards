import { act, renderHook } from '@testing-library/react'
import type { DocumentReference } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDocument } from './useDocument'

type Listener = { next: (snapshot: unknown) => void; error: (error: unknown) => void }

const firestore = vi.hoisted(() => ({
  listeners: [] as Listener[],
  unsubscribes: [] as ReturnType<typeof vi.fn>[],
}))

vi.mock('firebase/firestore', () => ({
  refEqual: (a: { path: string }, b: { path: string }) => a.path === b.path,
  onSnapshot: (_ref: unknown, _options: unknown, listener: Listener) => {
    firestore.listeners.push(listener)
    const unsubscribe = vi.fn()
    firestore.unsubscribes.push(unsubscribe)
    return unsubscribe
  },
}))

function ref(path: string): DocumentReference<{ name: string }> {
  return { path } as DocumentReference<{ name: string }>
}

function snapshot(data: { name: string }) {
  return {
    exists: () => true,
    data: () => data,
    metadata: { fromCache: false, hasPendingWrites: false },
  }
}

describe('useDocument with a key', () => {
  beforeEach(() => {
    firestore.listeners = []
    firestore.unsubscribes = []
  })

  it('keeps one subscription while the ref and the key stay equal', () => {
    const { rerender } = renderHook(({ path, key }) => useDocument(ref(path), key), {
      initialProps: { path: 'a/1', key: 0 },
    })

    rerender({ path: 'a/1', key: 0 })

    expect(firestore.listeners).toHaveLength(1)
    expect(firestore.unsubscribes[0]).not.toHaveBeenCalled()
  })

  it('subscribes again to the same ref when the key changes, and is loading until it answers', () => {
    const { result, rerender } = renderHook(({ key }) => useDocument(ref('a/1'), key), {
      initialProps: { key: 0 },
    })
    act(() => {
      firestore.listeners[0]?.error(
        Object.assign(new Error('denied'), { code: 'permission-denied' }),
      )
    })
    expect(result.current.status).toBe('error')

    rerender({ key: 1 })

    expect(firestore.unsubscribes[0]).toHaveBeenCalledTimes(1)
    expect(firestore.listeners).toHaveLength(2)
    expect(result.current.status).toBe('loading')

    act(() => {
      firestore.listeners[1]?.next(snapshot({ name: 'Ayla' }))
    })
    expect(result.current).toEqual({
      status: 'ready',
      data: { name: 'Ayla' },
      fromCache: false,
      hasPendingWrites: false,
    })
  })

  it('behaves as before without a key', () => {
    const { rerender } = renderHook(() => useDocument(ref('a/1')))

    rerender()

    expect(firestore.listeners).toHaveLength(1)
  })
})

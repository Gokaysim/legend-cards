import type { Unsubscribe } from 'firebase/firestore'
import { useEffect, useState } from 'react'

import type { SubscriptionError } from './errors'

/** The state of a real-time subscription. Feature code branches on `status`. */
export type Subscription<T> =
  | { status: 'loading' }
  | {
      status: 'ready'
      data: T
      /** The data came from the local cache, not (yet) confirmed by the server. */
      fromCache: boolean
      /** The data includes local writes the server has not confirmed yet. */
      hasPendingWrites: boolean
    }
  | { status: 'error'; error: SubscriptionError }

const LOADING = { status: 'loading' } as const

/** Starts listening to `target` and reports every new state through `emit`. Returns the unsubscribe function. */
export type SubscribeFn<Target, Data> = (
  target: Target,
  emit: (state: Subscription<Data>) => void,
) => Unsubscribe

/**
 * Shared core of `useDocument` and `useCollection`.
 *
 * - Resubscribes only when `isEqual` says the target changed, so a new but equal ref on every render is fine.
 * - Results are stored together with the target they belong to. A result for an old target is never
 *   returned: after a switch the state is `loading` until the new target reports.
 * - Cleanup unsubscribes, and a late callback after cleanup is dropped.
 */
export function useSnapshotSubscription<Target, Data>(
  target: Target,
  isEqual: (a: Target, b: Target) => boolean,
  subscribe: SubscribeFn<Target, Data>,
): Subscription<Data> {
  const [current, setCurrent] = useState(target)
  const targetChanged = current !== target && !isEqual(current, target)
  if (targetChanged) {
    // Adjusting state during render: React re-renders immediately with the new target.
    setCurrent(target)
  }

  const [result, setResult] = useState<{ target: Target; state: Subscription<Data> } | null>(null)

  useEffect(() => {
    let active = true
    const unsubscribe = subscribe(current, (state) => {
      if (active) setResult({ target: current, state })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [current, subscribe])

  // In the render where the target changes, `current` is still the old target: never hand out its data.
  if (targetChanged) return LOADING
  return result !== null && result.target === current ? result.state : LOADING
}

/** Wraps an equality check for optional targets: `null` (no target) equals only `null`. */
export function equalOrBothNull<Target>(
  isEqual: (a: Target, b: Target) => boolean,
): (a: Target | null, b: Target | null) => boolean {
  return (a, b) => (a === null || b === null ? a === b : isEqual(a, b))
}

/**
 * Wraps a subscribe function for optional targets. Without a target it listens to nothing and reports
 * `ready` with `emptyData` at once, for example while nobody is signed in.
 * Call it once at module level: the result must be stable, because subscriptions restart when it changes.
 */
export function subscribeOrEmpty<Target, Data>(
  subscribe: SubscribeFn<Target, Data>,
  emptyData: Data,
): SubscribeFn<Target | null, Data> {
  return (target, emit) => {
    if (target === null) {
      emit({ status: 'ready', data: emptyData, fromCache: false, hasPendingWrites: false })
      return () => {}
    }
    return subscribe(target, emit)
  }
}

/**
 * Combines subscriptions into one: an error if any failed, loading while any is loading, otherwise ready with
 * every result, from the cache or with pending writes if any of them is.
 */
export function combineSubscriptions<T extends Record<string, unknown>>(parts: {
  [K in keyof T]: Subscription<T[K]>
}): Subscription<T> {
  const entries = Object.entries(parts) as [keyof T, Subscription<T[keyof T]>][]
  for (const [, part] of entries) if (part.status === 'error') return part
  if (entries.some(([, part]) => part.status === 'loading')) return { status: 'loading' }
  const ready = entries.flatMap(([key, part]) => (part.status === 'ready' ? [{ key, part }] : []))
  return {
    status: 'ready',
    data: Object.fromEntries(ready.map(({ key, part }) => [key, part.data])) as T,
    fromCache: ready.some(({ part }) => part.fromCache),
    hasPendingWrites: ready.some(({ part }) => part.hasPendingWrites),
  }
}

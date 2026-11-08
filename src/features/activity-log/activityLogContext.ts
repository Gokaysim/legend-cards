import { createContext, useContext } from 'react'

import type { Holding } from '@/features/hands/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import type { LogRecords } from './events'

/**
 * How the İşlem Logu reads its records. `ActivityLogProvider` implements these hooks with Firestore; tests provide
 * fixed records instead, so unit tests never load Firebase. Only the log page calls them, so the subscriptions
 * exist only while the log is open.
 */
export type ActivityLogSource = {
  /** The sources, each with its `n` newest records; with a uid, only that user's. */
  useLogRecords: (uid: string | null, n: number) => Subscription<LogRecords>
  /** One holding by ID, for the side of a transfer the sources did not return. `null` reads nothing. */
  useHolding: (holdingId: string | null) => Subscription<Holding | null>
}

export const ActivityLogContext = createContext<ActivityLogSource | null>(null)

function useActivityLogSource(): ActivityLogSource {
  const value = useContext(ActivityLogContext)
  if (!value) throw new Error('Activity log hooks must be used inside <ActivityLogProvider>')
  return value
}

/** The log's records, live. Must be used inside `<ActivityLogProvider>`. */
export function useLogRecords(uid: string | null, n: number): Subscription<LogRecords> {
  return useActivityLogSource().useLogRecords(uid, n)
}

/** One holding, live. Must be used inside `<ActivityLogProvider>`. */
export function useHolding(holdingId: string | null): Subscription<Holding | null> {
  return useActivityLogSource().useHolding(holdingId)
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

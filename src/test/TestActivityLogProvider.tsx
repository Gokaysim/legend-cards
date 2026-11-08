import { type ReactNode, useMemo } from 'react'

import {
  ActivityLogContext,
  type ActivityLogSource,
} from '@/features/activity-log/activityLogContext'
import type { LogRecords } from '@/features/activity-log/events'
import type { Holding } from '@/features/hands/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

const NO_RECORDS: LogRecords = { given: [], closed: [], entries: [] }

export type TestActivityLog = {
  /**
   * The log's records. Defaults to ready and empty. A function receives the filter's uid and the limit, so a test
   * can answer like the queries would and see what the page asked for.
   */
  records?: Subscription<LogRecords> | ((uid: string | null, n: number) => Subscription<LogRecords>)
  /** Holdings readable by ID (the other side of a transfer). Missing ones read as ready `null`. */
  holdings?: Record<string, Holding>
}

export type TestActivityLogProviderProps = TestActivityLog & { children: ReactNode }

/** Provides fixed log records to components under test, without Firebase. */
export function TestActivityLogProvider({
  records,
  holdings,
  children,
}: TestActivityLogProviderProps) {
  const value = useMemo<ActivityLogSource>(
    () => ({
      useLogRecords: (uid, n) =>
        typeof records === 'function' ? records(uid, n) : (records ?? ready(NO_RECORDS)),
      useHolding: (holdingId) => ready(holdingId === null ? null : (holdings?.[holdingId] ?? null)),
    }),
    [records, holdings],
  )
  return <ActivityLogContext value={value}>{children}</ActivityLogContext>
}

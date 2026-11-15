import { useId, useMemo, useState } from 'react'

import { screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { groupByDay } from '@/lib/days'
import { profileName, useProfiles } from '@/features/users/usersContext'

import { useLogRecords } from './activityLogContext'
import { type LogRecords, newestEvents } from './events'
import { LogEventRow } from './LogEventRow'

/** How many events the log shows at first, and how many more "Daha fazla" adds. */
export const LOG_PAGE_SIZE = 50

/** The records shown, kept while a larger page loads, so the list stays in place. */
type Shown = { uid: string | null; limit: number; records: LogRecords }

/**
 * The İşlem Logu: card movements and balance changes in one live list, newest first, grouped by day. It is read
 * from the permanent records, never written separately. It shows the newest 50 events, "Daha fazla" shows 50 more,
 * and a filter keeps one user's events.
 */
export function ActivityLogPage() {
  const ids = useId()
  const profiles = useProfiles()
  const [uid, setUid] = useState<string | null>(null)
  const [limit, setLimit] = useState(LOG_PAGE_SIZE)
  const records = useLogRecords(uid, limit)

  // While a larger page loads, the subscription starts over: keep showing the page that was on screen when
  // "Daha fazla" was selected, unless the filter changed meanwhile.
  const [kept, setKept] = useState<Shown | null>(null)
  const visible: Shown | null =
    records.status === 'ready'
      ? { uid, limit, records: records.data }
      : records.status === 'loading' && kept?.uid === uid
        ? kept
        : null
  const showMore = () => {
    setKept(visible)
    setLimit((current) => current + LOG_PAGE_SIZE)
  }

  const byId = useMemo(
    () => new Map(profiles.status === 'ready' ? profiles.data.map((p) => [p.id, p]) : []),
    [profiles],
  )
  const nameOf = (id: string) => {
    const profile = byId.get(id)
    return profile ? profileName(profile) : 'İsimsiz oyuncu'
  }

  const page = visible ? newestEvents(visible.records, visible.limit) : null
  const groups = page ? groupByDay(page.events) : []
  const isLoadingMore = records.status === 'loading' && visible !== null

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('activity-log').label}
        mascot={screenById('activity-log').mascot}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${ids}-filter`} className="text-sm font-medium text-ink">
          Oyuncu
        </label>
        <select
          id={`${ids}-filter`}
          value={uid ?? ''}
          onChange={(event) => {
            setUid(event.target.value === '' ? null : event.target.value)
            setLimit(LOG_PAGE_SIZE)
          }}
          className="min-w-0 rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink"
        >
          <option value="">Herkes</option>
          {profiles.status === 'ready'
            ? profiles.data.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profileName(profile)}
                </option>
              ))
            : null}
        </select>
      </div>

      {records.status === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          İşlem Logu yüklenemedi.
        </p>
      ) : page === null ? (
        <Spinner label="İşlem Logu yükleniyor…" className="py-12" />
      ) : page.events.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-4 text-ink-muted">
          Henüz kayıtlı işlem yok.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`${ids}-${group.key}`}
              className="flex flex-col gap-1 rounded-xl border border-line bg-pane px-4 py-3"
            >
              <h2 id={`${ids}-${group.key}`} className="text-sm font-semibold text-gold">
                {group.label}
              </h2>
              <ol className="flex flex-col divide-y divide-line">
                {group.items.map((event) => (
                  <LogEventRow
                    key={event.key}
                    event={event}
                    nameOf={nameOf}
                    actor={event.by === null ? undefined : byId.get(event.by)}
                  />
                ))}
              </ol>
            </section>
          ))}
          {page.mayHaveMore ? (
            <Button className="self-center" disabled={isLoadingMore} onClick={showMore}>
              {isLoadingMore ? 'Yükleniyor…' : 'Daha fazla'}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}

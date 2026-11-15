// Dates as the lists of events show them: grouped by day, in Turkish, in the device's time zone. The İşlem Logu and
// the Kart geçmişi share them, so both group the same way.

const dayFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

const shortDateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "14 Kasım 2026": a day's heading in a list of events. */
export function formatDay(at: Date): string {
  return dayFormat.format(at)
}

/** "19:42" in the device's time zone. */
export function formatTime(at: Date): string {
  return timeFormat.format(at)
}

/** "14 Kas 2026": a date in a small space, such as a stat tile. */
export function formatShortDate(at: Date): string {
  return shortDateFormat.format(at)
}

/** Anything that happened at a server time, `null` while the time is pending. */
export type Dated = { at: { toDate: () => Date } | null }

export type DayGroup<T> = { key: string; label: string; items: T[] }

/**
 * Groups items, given newest first, under the day they happened on, in the device's time zone. Items whose server
 * time is still pending join the newest day, or "Bugün" when there is none yet.
 */
export function groupByDay<T extends Dated>(items: readonly T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  const pending: T[] = []
  for (const item of items) {
    if (item.at === null) {
      pending.push(item)
      continue
    }
    const date = item.at.toDate()
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const last = groups.at(-1)
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: formatDay(date), items: [item] })
  }
  if (pending.length > 0) {
    const first = groups[0]
    if (first) first.items.unshift(...pending)
    else groups.push({ key: 'pending', label: 'Bugün', items: pending })
  }
  return groups
}

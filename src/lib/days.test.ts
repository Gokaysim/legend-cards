import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { formatShortDate, formatTime, groupByDay } from './days'

const at = (year: number, month: number, day: number, hour = 12) =>
  Timestamp.fromDate(new Date(year, month - 1, day, hour))

describe('groupByDay', () => {
  it('groups items of two days under their Turkish dates, newest day first', () => {
    const items = [
      { id: 'use', at: at(2026, 11, 14, 20) },
      { id: 'draw', at: at(2026, 11, 14, 9) },
      { id: 'pack', at: at(2026, 11, 12) },
    ]
    const groups = groupByDay(items)
    expect(groups.map((group) => group.label)).toEqual(['14 Kasım 2026', '12 Kasım 2026'])
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ['use', 'draw'],
      ['pack'],
    ])
  })

  it('keeps the items of one day in one group', () => {
    const groups = groupByDay([{ at: at(2026, 11, 14, 20) }, { at: at(2026, 11, 14, 8) }])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.items).toHaveLength(2)
  })

  it('puts an item whose time is pending on the newest day, or on "Bugün" alone', () => {
    const pending = { id: 'now', at: null }
    const withDays = groupByDay([pending, { id: 'old', at: at(2026, 11, 12) }])
    expect(withDays).toHaveLength(1)
    expect(withDays[0]?.items.map((item) => item.id)).toEqual(['now', 'old'])

    expect(groupByDay([pending])).toEqual([{ key: 'pending', label: 'Bugün', items: [pending] }])
  })

  it('returns no groups for no items', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('date formats', () => {
  it('writes a time and a short date in Turkish', () => {
    const date = new Date(2026, 10, 14, 19, 42)
    expect(formatTime(date)).toBe('19:42')
    expect(formatShortDate(date)).toBe('14 Kas 2026')
  })
})

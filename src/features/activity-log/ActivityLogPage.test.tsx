import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import type { Holding } from '@/features/hands/schema'
import { testCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'
import { renderApp } from '@/test/renderApp'
import type { TestActivityLog } from '@/test/TestActivityLogProvider'

import type { LogRecords } from './events'

const me = testProfile()
const dana = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const PROFILES = ready([ayla, bora, dana, me])

const eyes = testCard("Aboleth's Eyes")

/** Noon (UTC) and later on a day of November 2026, so the day is the same in every test time zone. */
const on = (day: number, minute = 0) => Timestamp.fromMillis(Date.UTC(2026, 10, day, 12, minute))
const clock = (at: Timestamp) =>
  new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(at.toDate())

const givenToAyla = testHolding(eyes, 'ayla', 0, {
  id: 'h-given',
  givenAt: on(8, 0),
  givenBy: 'dana',
})
const usedByAyla = testHolding(eyes, 'ayla', 0, {
  id: 'h-used',
  givenAt: on(7, 0),
  returnedAt: on(8, 10),
  returnedBy: 'ayla',
  returnReason: 'used',
  usedOn: 'Thorin',
})
const lpForAyla = testLedgerEntry(0, { id: 'lp-ayla', account: 'ayla', by: 'dana', at: on(8, 20) })
const gpForParty = testGpEntry(0, { id: 'gp', by: 'dana', at: on(8, 30) })
const oldSide = testHolding(eyes, 'ayla', 0, {
  id: 'h-old',
  givenAt: on(7, 0),
  returnedAt: on(8, 40),
  returnedBy: 'dana',
  returnReason: 'transferred',
  transferredTo: 'h-new',
})
const newSide = testHolding(eyes, 'bora', 0, {
  id: 'h-new',
  givenAt: on(8, 40),
  givenBy: 'dana',
  givenVia: 'transfer',
  transferredFrom: 'h-old',
})

const records = (parts: Partial<LogRecords> = {}): LogRecords => ({
  given: [],
  closed: [],
  entries: [],
  ...parts,
})

function renderLog(activityLog: TestActivityLog) {
  return renderApp({ path: '/log', users: { profiles: PROFILES }, activityLog })
}

/** The screen itself, without the sidebar. */
const main = () => within(screen.getByRole('main'))
const rows = () => main().getAllByRole('listitem')
const rowTexts = () => rows().map((row) => row.textContent)

describe('ActivityLogPage', () => {
  it('lists card events and balance changes together, newest first', () => {
    renderLog({ records: ready(records({ given: [givenToAyla], entries: [lpForAyla] })) })

    expect(main().getByRole('heading', { level: 1, name: 'İşlem Logu' })).toBeInTheDocument()
    const [first, second] = rows()
    expect(first).toHaveTextContent('Ayla: +2 LP (5 → 7)')
    expect(second).toHaveTextContent("Aboleth's Eyes kartını Ayla'ya verdi.")
  })

  it('shows a new event at the top without a reload', () => {
    const { setActivityLog } = renderLog({ records: ready(records({ given: [givenToAyla] })) })

    setActivityLog({ records: ready(records({ given: [givenToAyla], closed: [usedByAyla] })) })

    expect(rows()[0]).toHaveTextContent("Aboleth's Eyes kartını Thorin üzerinde kullandı.")
  })

  it('lists no event when a card is only switched active', () => {
    const { setActivityLog } = renderLog({ records: ready(records({ given: [givenToAyla] })) })

    setActivityLog({ records: ready(records({ given: [{ ...givenToAyla, active: true }] })) })

    expect(rows()).toHaveLength(1)
  })

  it('shows the time, who did it with the DM marked, and what happened', () => {
    renderLog({
      records: ready(records({ closed: [usedByAyla], entries: [lpForAyla, gpForParty] })),
    })
    const [gp, lp, used] = rows()

    expect(lp).toHaveTextContent(clock(on(8, 20)))
    expect(within(lp!).getByText('Dana')).toBeInTheDocument()
    expect(within(lp!).getByText('DM')).toBeInTheDocument()
    expect(lp).toHaveTextContent("Ayla: +2 LP (5 → 7) · Boss'u yendi")

    expect(gp).toHaveTextContent('Grup kesesi: +5.000 GP (7.500 → 12.500) · Ejderha hazinesi')

    expect(within(used!).getByText('Ayla')).toBeInTheDocument()
    expect(within(used!).queryByText('DM')).not.toBeInTheDocument()
    expect(within(used!).getByText("Aboleth's Eyes")).toHaveAttribute('lang', 'en')
    expect(used).toHaveTextContent('Thorin')
  })

  it('shows a transfer once', () => {
    renderLog({ records: ready(records({ given: [newSide], closed: [oldSide] })) })

    expect(rowTexts()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent("Aboleth's Eyes kartını Ayla'dan Bora'ya verdi.")
  })

  it('groups events under their day, newest day first', () => {
    const earlier = testLedgerEntry(0, { id: 'lp-7', account: 'bora', at: on(7, 0) })
    renderLog({ records: ready(records({ given: [givenToAyla], entries: [earlier] })) })

    const days = main().getAllByRole('heading', { level: 2 })
    expect(days.map((day) => day.textContent)).toEqual(['8 Kasım 2026', '7 Kasım 2026'])
    const seventh = within(main().getByRole('region', { name: '7 Kasım 2026' }))
    expect(seventh.getByRole('listitem')).toHaveTextContent('Bora: +2 LP')
  })

  it('shows 50 events first and 50 more with "Daha fazla", keeping the list while they load', async () => {
    const user = userEvent.setup()
    const all = Array.from({ length: 120 }, (_, index) =>
      testLedgerEntry(0, {
        id: `e-${index}`,
        account: 'ayla',
        at: Timestamp.fromMillis(Date.UTC(2026, 10, 8, 12) - index * 1000),
      }),
    )
    const answer = (_uid: string | null, n: number) => ready(records({ entries: all.slice(0, n) }))
    const { setActivityLog } = renderLog({ records: answer })
    expect(rows()).toHaveLength(50)

    // The next page is loading: the 50 stay, and the button says so.
    setActivityLog({ records: (_uid, n) => (n > 50 ? { status: 'loading' } : answer(_uid, n)) })
    await user.click(main().getByRole('button', { name: 'Daha fazla' }))
    expect(rows()).toHaveLength(50)
    expect(main().getByRole('button', { name: 'Yükleniyor…' })).toBeDisabled()

    setActivityLog({ records: answer })
    expect(rows()).toHaveLength(100)
    await user.click(main().getByRole('button', { name: 'Daha fazla' }))
    expect(rows()).toHaveLength(120)
    expect(main().queryByRole('button', { name: 'Daha fazla' })).not.toBeInTheDocument()
  })

  it("keeps only one player's events when filtered, without party purse changes", async () => {
    const user = userEvent.setup()
    const all = records({
      given: [givenToAyla],
      closed: [usedByAyla],
      entries: [lpForAyla, gpForParty, testLedgerEntry(0, { id: 'lp-bora', account: 'bora' })],
    })
    const asked: (string | null)[] = []
    renderLog({
      records: (uid) => {
        asked.push(uid)
        if (uid === null) return ready(all)
        return ready({
          given: all.given.filter((holding) => holding.uid === uid),
          closed: all.closed.filter((holding) => holding.uid === uid),
          entries: all.entries.filter((entry) => entry.account === uid),
        })
      },
    })
    expect(rows()).toHaveLength(5)

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Ayla')

    expect(asked.at(-1)).toBe('ayla')
    expect(rowTexts()).toHaveLength(3)
    const shown = rowTexts().join(' ')
    expect(shown).not.toContain('Grup kesesi')
    expect(shown).not.toContain('Bora')
  })

  it('shows a transfer to the filtered player, reading the other side', async () => {
    const user = userEvent.setup()
    const holdings: Record<string, Holding> = { 'h-old': oldSide }
    renderLog({
      records: (uid) =>
        ready(uid === 'bora' ? records({ given: [newSide] }) : records({ closed: [oldSide] })),
      holdings,
    })

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Bora')

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent("Aboleth's Eyes kartını Ayla'dan Bora'ya verdi.")
  })

  it('says when the log is loading, cannot be loaded, or is empty', () => {
    const { setActivityLog } = renderLog({ records: { status: 'loading' } })
    expect(main().getByRole('status')).toHaveTextContent('İşlem Logu yükleniyor…')

    setActivityLog({
      records: {
        status: 'error',
        error: { kind: 'permission-denied', message: 'x', path: 'ledger' },
      },
    })
    expect(main().getByRole('alert')).toHaveTextContent('İşlem Logu yüklenemedi.')

    setActivityLog({ records: ready(records()) })
    expect(main().getByText('Henüz kayıtlı işlem yok.')).toBeInTheDocument()
  })
})

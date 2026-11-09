import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'
import { testPack } from '@/test/packFixtures'
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
  draws: [],
  entries: [],
  ...parts,
})

function renderLog(activityLog: TestActivityLog, cards: Card[] = []) {
  return renderApp({
    path: '/log',
    users: { profiles: PROFILES },
    cards: { cards: ready(cards) },
    activityLog,
  })
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
          draws: all.draws.filter((draw) => draw.uid === uid),
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

describe('draws in the İşlem Logu', () => {
  const rite = testCard('Blood Rite')
  /** Ayla's paid draw of "Blood Rite", with its holding and its payment. */
  const aylaDraws = testDraw(rite, 'ayla', 0, { id: 'd-ayla', at: on(8, 30) })
  const lpForBora = testLedgerEntry(0, {
    id: 'lp-bora',
    account: 'bora',
    by: 'dana',
    at: on(8, 20),
  })

  it('lists a draw among the other events, newest first', () => {
    renderLog({ records: ready(records({ draws: [aylaDraws], entries: [lpForBora] })) })

    const [first, second] = rows()
    expect(first).toHaveTextContent('Blood Rite kartını çekti (−1 LP).')
    expect(second).toHaveTextContent('Bora: +2 LP (5 → 7)')
  })

  // The queries leave a draw's holding and payment out (see the log queries' emulator test).
  it('lists a draw as one event', () => {
    renderLog({ records: ready(records({ draws: [aylaDraws] })) })

    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]!).getByText('Ayla')).toBeInTheDocument()
    expect(within(rows()[0]!).getByText('Blood Rite')).toHaveAttribute('lang', 'en')
    expect(rows()[0]).toHaveTextContent('Blood Rite kartını çekti (−1 LP).')
    expect(rowTexts().join(' ')).not.toContain('verdi')
  })

  it("shows the DM's draw with the DM marked, the hand, the card and the filters, without a payment", () => {
    const dmDraw = testDmDraw(rite, 'bora', 0, {
      id: 'd-dm',
      by: 'dana',
      at: on(8, 40),
      filters: { cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
    })
    renderLog({ records: ready(records({ draws: [dmDraw] })) })

    const [row] = rows()
    expect(within(row!).getByText('Dana')).toBeInTheDocument()
    expect(within(row!).getByText('DM')).toBeInTheDocument()
    expect(row).toHaveTextContent("Bora'ya Blood Rite kartını çekti (filtre: Rare).")
    expect(row).not.toHaveTextContent('LP')
  })

  it('says that a Cursed card was drawn, and names it', () => {
    const cursed = testDraw(testCursedCard('Visions of Death'), 'ayla', 0, {
      id: 'd-cursed',
      at: on(8, 50),
    })
    renderLog({ records: ready(records({ draws: [cursed] })) })

    expect(rows()[0]).toHaveTextContent('Cursed kart çekti: Visions of Death.')
  })

  it("keeps the draws into the chosen player's hand in the player filter", async () => {
    const user = userEvent.setup()
    const dmDrawForAyla = testDmDraw(rite, 'ayla', 0, { id: 'd-dm', by: 'dana', at: on(8, 40) })
    const boraDraws = testDraw(eyes, 'bora', 0, { id: 'd-bora', at: on(8, 45) })
    const all = records({ draws: [boraDraws, dmDrawForAyla] })
    renderLog({
      records: (uid) =>
        ready(
          uid === null ? all : records({ draws: all.draws.filter((draw) => draw.uid === uid) }),
        ),
    })
    expect(rows()).toHaveLength(2)

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Ayla')

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent("Ayla'ya Blood Rite kartını çekti.")
  })
})

describe('packs in the İşlem Logu', () => {
  const SHOWN = ['A', 'B', 'C', 'D', 'E'].map((name) => testCard(name))
  const offered = SHOWN.map((card) => card.id)
  const visions = testCursedCard('Visions of Death')
  const lpForBora = testLedgerEntry(0, {
    id: 'lp-bora',
    account: 'bora',
    by: 'dana',
    at: on(8, 20),
  })
  /** Ayla's Kesqerian Nights Standard Pack for 2 LP, opened at 8:30 and still open. */
  const opening = testPack('ayla', { id: 'p-ayla', at: on(8, 30), offered })
  const chosen = testPack('ayla', {
    id: 'p-ayla',
    at: on(8, 30),
    offered,
    revealed: [0, 1, 2, 3, 4],
    status: 'chosen',
    closedAt: on(8, 35),
    closedBy: 'ayla',
    chosen: { cardId: eyes.id, cardName: "Aboleth's Eyes", cardKind: 'normal', holdingId: 'h1' },
  })

  it('lists a pack among the other events, newest first', () => {
    renderLog({ records: ready(records({ draws: [chosen], entries: [lpForBora] })) })

    const [first, second] = rows()
    expect(first).toHaveTextContent(
      "Kesqerian Nights Standard Pack açtı ve Aboleth's Eyes kartını seçti (−2 LP).",
    )
    expect(second).toHaveTextContent('Bora: +2 LP (5 → 7)')
  })

  it('lists a chosen pack as one event, with the cards it showed', () => {
    renderLog({ records: ready(records({ draws: [chosen] })) }, SHOWN)

    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]!).getByText('Ayla')).toBeInTheDocument()
    expect(within(rows()[0]!).getByText("Aboleth's Eyes")).toHaveAttribute('lang', 'en')
    expect(rows()[0]).toHaveTextContent('Sunulan: A, B, C, D, E')
  })

  it("names a Cursed Pack's Cursed card with the chosen card", () => {
    const cursedPack = {
      ...chosen,
      packType: 'cursed' as const,
      cost: 1,
      cursed: { cardId: visions.id, cardName: 'Visions of Death', holdingId: 'h2' },
    }
    renderLog({ records: ready(records({ draws: [cursedPack] })) })

    expect(rows()[0]).toHaveTextContent(
      "Kesqerian Nights Cursed Pack açtı ve Aboleth's Eyes kartını seçti; Cursed kart: Visions of Death (−1 LP).",
    )
  })

  it('says that the DM cancelled a pack and refunded it, and names the hand when the DM opened it', () => {
    const cancelled = testPack('bora', {
      id: 'p-bora',
      by: 'dana',
      at: on(8, 40),
      offered,
      paidWith: 'gp',
      cost: 7500,
      status: 'cancelled',
      closedAt: on(8, 45),
      closedBy: 'dana',
      refundEntryId: 'e2',
    })
    renderLog({ records: ready(records({ draws: [cancelled] })) })

    expect(within(rows()[0]!).getByText('DM')).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent(
      'Bora için Kesqerian Nights Standard Pack açtı (−7.500 GP); DM iptal etti, 7.500 GP iade edildi.',
    )
  })

  it("says when the DM chose for a player's pack", () => {
    renderLog({ records: ready(records({ draws: [{ ...chosen, closedBy: 'dana' }] })) })

    expect(rows()[0]).toHaveTextContent("Aboleth's Eyes kartını seçti (seçimi DM yaptı) (−2 LP).")
  })

  it('says that a pack is being opened, and changes to the choice live', () => {
    const { setActivityLog } = renderLog({ records: ready(records({ draws: [opening] })) })
    expect(rows()[0]).toHaveTextContent('Kesqerian Nights Standard Pack açıyor (−2 LP).')

    setActivityLog({ records: ready(records({ draws: [chosen] })) })

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent("açtı ve Aboleth's Eyes kartını seçti")
  })

  it('shows a free pack as free', () => {
    const free = { ...opening, by: 'dana', paidWith: 'none' as const, cost: 0, entryId: null }
    renderLog({ records: ready(records({ draws: [free] })) })

    expect(rows()[0]).toHaveTextContent(
      'Ayla için Kesqerian Nights Standard Pack açıyor (ücretsiz).',
    )
  })

  it('keeps the packs opened for the chosen player in the player filter', async () => {
    const user = userEvent.setup()
    const forBora = testPack('bora', { id: 'p-bora', by: 'dana', at: on(8, 40), offered })
    const all = records({ draws: [forBora, chosen] })
    renderLog({
      records: (uid) =>
        ready(
          uid === null ? all : records({ draws: all.draws.filter((draw) => draw.uid === uid) }),
        ),
    })
    expect(rows()).toHaveLength(2)

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Ayla')

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent("Aboleth's Eyes kartını seçti")
  })
})

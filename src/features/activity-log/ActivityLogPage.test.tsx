import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { cardHistoryPath } from '@/app/screens'
import type { Card, Definition } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import { testCard, testCursedCard, testCustomCard } from '@/test/cardFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'
import { testPack } from '@/test/packFixtures'
import { testTrueWord, testWordDraft, testWordHolding, testWordUse } from '@/test/trueWordFixtures'
import { testCustomDraft } from '@/test/customDraftFixtures'
import { renderApp } from '@/test/renderApp'
import type { TestActivityLog } from '@/test/TestActivityLogProvider'
import { testSetChange } from '@/test/setFixtures'
import { testTableChange } from '@/test/tableFixtures'

import { EMPTY_LOG_RECORDS, type LogRecords } from './events'

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
  ...EMPTY_LOG_RECORDS,
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

  it('lists a set change among the other events, newest first, for every user', () => {
    const rename = testSetChange(on(8, 50).toMillis())
    renderLog({ records: ready(records({ entries: [lpForAyla], setChanges: [rename] })) })

    const [first, second] = rows()
    expect(first).toHaveTextContent('Ballad of Ulagal setini düzenledi.')
    expect(first).toHaveTextContent('Ad')
    expect(first).not.toHaveTextContent('Yalnızca DM')
    expect(second).toHaveTextContent('Ayla: +2 LP (5 → 7)')
  })

  it('lists a player draw mode change among the other events, newest first, for every user', () => {
    const change = testTableChange(on(8, 50).toMillis())
    renderLog({ records: ready(records({ entries: [lpForAyla], tableChanges: [change] })) })

    const [first, second] = rows()
    expect(first).toHaveTextContent('oyuncu kart çekişini “Filtreli çekiş” yaptı.')
    expect(first).not.toHaveTextContent('Yalnızca DM')
    expect(second).toHaveTextContent('Ayla: +2 LP (5 → 7)')
  })

  it("lists a fight's start and end among the other events, newest first, naming the DM", () => {
    const start = { id: 'f-1', by: 'dana', at: on(8, 50), step: 'start' as const, count: 6 }
    const end = { id: 'f-2', by: 'dana', at: on(9, 30), step: 'end' as const, count: 5 }
    renderLog({ records: ready(records({ entries: [lpForAyla], combatChanges: [start, end] })) })

    const [first, second, third] = rows()
    expect(first).toHaveTextContent('savaşı bitirdi: 5 tur.')
    expect(first).toHaveTextContent('Dana')
    expect(second).toHaveTextContent('savaşı başlattı: 6 katılımcı.')
    expect(third).toHaveTextContent('Ayla: +2 LP (5 → 7)')
  })

  it('lists a DM role change among the other events, newest first, naming the DM', () => {
    const grant = {
      id: 'r-1',
      by: 'dana',
      at: on(8, 50),
      target: 'ayla',
      before: 'player' as const,
      after: 'dm' as const,
    }
    renderLog({ records: ready(records({ entries: [lpForAyla], roleChanges: [grant] })) })

    const [first, second] = rows()
    expect(first).toHaveTextContent("Ayla'yı DM yaptı.")
    expect(first).toHaveTextContent('Dana')
    expect(second).toHaveTextContent('Ayla: +2 LP (5 → 7)')
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

  it("shows a player's own discard and LP spend under the player's name, not marked as DM", () => {
    const discarded = {
      ...usedByAyla,
      id: 'h-discarded',
      returnReason: 'discarded' as const,
      usedOn: null,
    }
    const spent = testLedgerEntry(0, {
      id: 'lp-spent',
      account: 'ayla',
      by: 'ayla',
      delta: -1,
      balanceAfter: 4,
      reason: 'd20 avantajı',
      at: on(8, 20),
    })
    renderLog({ records: ready(records({ closed: [discarded], entries: [spent] })) })
    const [lp, discard] = rows()

    // Ayla did it, and her account changed: both name her.
    expect(within(lp!).getAllByText('Ayla')).toHaveLength(2)
    expect(within(lp!).queryByText('DM')).not.toBeInTheDocument()
    expect(lp).toHaveTextContent('Ayla: −1 LP (5 → 4) · d20 avantajı')
    expect(within(discard!).queryByText('DM')).not.toBeInTheDocument()
    expect(discard).toHaveTextContent("Aboleth's Eyes kartını attı.")
    expect(discard).not.toHaveTextContent('elinden')
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
          ...EMPTY_LOG_RECORDS,
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
      filters: { setCode: null, cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
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

describe('True Words in the İşlem Logu', () => {
  const ABYSS = testTrueWord('Abyss')
  const WORDS = [ABYSS, testTrueWord('Aid'), testTrueWord('Dragon')]
  const lpForBora = testLedgerEntry(0, {
    id: 'lp-bora',
    account: 'bora',
    by: 'dana',
    at: on(8, 20),
  })
  /** Ayla's draft for 3 LP, started at 8:30, in which she learned Abyss. */
  const learnedDraft = testWordDraft('w-ayla', 'ayla', WORDS, {
    at: on(8, 30),
    cost: 3,
    status: 'learned',
    closedAt: on(8, 32),
    closedBy: 'ayla',
    learned: { cardId: ABYSS.id, cardName: 'Abyss', holdingId: 'r1' },
  })

  function renderWordLog(logRecords: LogRecords) {
    return renderApp({
      path: '/log',
      users: { profiles: PROFILES },
      activityLog: { records: ready(logRecords) },
      trueWords: { words: ready(WORDS) },
    })
  }

  it('lists a learned draft as one event, before older events, with the words it showed', () => {
    renderWordLog(records({ draws: [learnedDraft], entries: [lpForBora] }))

    const [first, second] = rows()
    expect(first).toHaveTextContent(
      "True Word draft'ı açtı ve Abyss True Word'ünü öğrendi (−3 LP).",
    )
    expect(within(first!).getByText('Ayla')).toBeInTheDocument()
    expect(first).toHaveTextContent('Sunulan: Abyss, Aid, Dragon')
    expect(second).toHaveTextContent('Bora: +2 LP (5 → 7)')
  })

  it('says that a draft is open, and that the DM cancelled one with a refund', () => {
    const open = testWordDraft('w-open', 'ayla', WORDS, { at: on(8, 40), cost: 3 })
    const cancelled = testWordDraft('w-cancel', 'bora', WORDS, {
      by: 'dana',
      at: on(8, 30),
      cost: 2,
      status: 'cancelled',
      closedAt: on(8, 35),
      closedBy: 'dana',
      refundEntryId: 'e2',
    })
    renderWordLog(records({ draws: [open, cancelled] }))

    expect(rowTexts()[0]).toContain("True Word draft'ı açıyor (−3 LP).")
    expect(rowTexts()[1]).toContain(
      "Bora için True Word draft'ı açtı (−2 LP); DM iptal etti, 2 LP iade edildi.",
    )
  })

  it('lists the words the DM taught and took back', () => {
    const holding = testWordHolding('r2', ABYSS, 'bora', {
      givenAt: on(8, 10),
      returnedAt: on(8, 50),
      returnedBy: 'dana',
      returnReason: 'discarded',
    })
    renderWordLog(records({ given: [holding], closed: [holding] }))

    expect(rowTexts()[0]).toContain("Bora'dan Abyss True Word'ünü geri aldı.")
    expect(rowTexts()[1]).toContain("Bora'ya Abyss True Word'ünü öğretti.")
  })

  it("lists a word use with its payment, and keeps only the chosen player's uses in the filter", async () => {
    const user = userEvent.setup()
    const aylaUse = testWordUse('u-ayla', ABYSS, 'ayla', { cost: 5, at: on(8, 40) })
    const boraUse = testWordUse('u-bora', WORDS[1]!, 'bora', { at: on(8, 45) })
    const all = records({ uses: [boraUse, aylaUse], entries: [lpForBora] })
    renderApp({
      path: '/log',
      users: { profiles: PROFILES },
      trueWords: { words: ready(WORDS) },
      activityLog: {
        records: (uid) =>
          ready(uid === null ? all : records({ uses: all.uses.filter((use) => use.uid === uid) })),
      },
    })
    expect(rowTexts()[0]).toContain("Aid True Word'ünü kullandı (−1 LP).")
    expect(rowTexts()[1]).toContain("Abyss True Word'ünü kullandı (−5 LP).")
    expect(rows()).toHaveLength(3)

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Ayla')

    expect(rowTexts()).toHaveLength(1)
    expect(rowTexts()[0]).toContain("Abyss True Word'ünü kullandı (−5 LP).")
  })
})

describe('definition changes in the İşlem Logu', () => {
  it("lists a player's use and discard, and nothing of the DM's card work", () => {
    const discardedByAyla = testHolding(eyes, 'ayla', 0, {
      id: 'h-discarded',
      givenAt: on(7, 0),
      returnedAt: on(8, 15),
      returnedBy: 'ayla',
      returnReason: 'discarded',
    })
    renderLog({ records: ready(records({ closed: [usedByAyla, discardedByAyla] })) })

    expect(rowTexts()).toEqual([
      expect.stringContaining("Aboleth's Eyes kartını attı."),
      expect.stringContaining("Aboleth's Eyes kartını Thorin üzerinde kullandı."),
    ])
    expect(main().queryByText(/Yalnızca DM/)).toBeNull()
    expect(main().queryByText(/düzenledi|yayınladı|Import/)).toBeNull()
  })
})

describe('Custom Card drafts in the İşlem Logu', () => {
  /** Ayla's 3-cost draft for 3 LP, started at 8:40 and finished with Caster, Draw and Gold. */
  const finished = testCustomDraft({
    id: 'c-ayla',
    uid: 'ayla',
    by: 'ayla',
    at: on(8, 40),
    pickTypes: ['Caster', 'Draw', 'Gold'],
    pickCosts: [3, 3, 3],
    offered: [],
    status: 'finished',
    closedAt: on(8, 41),
    closedBy: 'ayla',
    cardId: 'custom-1',
    holdingId: 'h-custom',
  })
  const lpForBora = testLedgerEntry(0, {
    id: 'lp-bora',
    account: 'bora',
    by: 'dana',
    at: on(8, 20),
  })

  it('lists a draft as one event above an older LP change, with its card and effects', () => {
    renderLog({ records: () => ready(records({ draws: [finished], entries: [lpForBora] })) })
    expect(rows()).toHaveLength(2)
    expect(rows()[0]).toHaveTextContent(
      "Custom Card draft'ı açtı ve 3-Cost Custom Card kartını yaptı (−3 LP): Caster, Draw, Gold.",
    )
  })

  it("keeps a player's drafts in the player filter", async () => {
    const user = userEvent.setup()
    const boraDraft = testCustomDraft({ id: 'c-bora', uid: 'bora', by: 'bora', at: on(8, 45) })
    const all = records({ draws: [boraDraft, finished] })
    renderLog({
      records: (uid) =>
        ready(
          uid === null ? all : records({ draws: all.draws.filter((draw) => draw.uid === uid) }),
        ),
    })
    expect(rows()).toHaveLength(2)

    await user.selectOptions(main().getByRole('combobox', { name: 'Oyuncu' }), 'Ayla')

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('3-Cost Custom Card kartını yaptı')
  })

  it('updates an open draft live when it ends', () => {
    const open = testCustomDraft({ id: 'c-ayla', uid: 'ayla', by: 'ayla', at: on(8, 40) })
    const view = renderLog({ records: () => ready(records({ draws: [open] })) })
    expect(rows()[0]).toHaveTextContent("3-Cost Custom Card draft'ı açıyor (−3 LP).")
    view.setActivityLog({ records: () => ready(records({ draws: [finished] })) })
    expect(rows()[0]).toHaveTextContent('kartını yaptı')
  })
})

describe('links in the İşlem Logu', () => {
  /** The log with these records and cards, seen by `viewer` (a player unless given), and the cards' holders. */
  const renderLinks = (
    parts: Partial<LogRecords>,
    {
      cards = [eyes],
      viewer = me,
      holdings = [],
    }: { cards?: Definition[]; viewer?: typeof me; holdings?: Holding[] } = {},
  ) =>
    renderApp({
      path: '/log',
      users: { profiles: PROFILES, currentProfile: ready(viewer) },
      cards: { cards: ready(cards) },
      holdings: { openHoldings: ready(holdings) },
      activityLog: { records: ready(records(parts)) },
    })
  const link = (row: HTMLElement, name: string) => within(row).getByRole('link', { name })

  it("links the user who did it to their hand, and keeps the DM's mark beside the name", async () => {
    const user = userEvent.setup()
    const { router } = renderLinks({ given: [givenToAyla] })
    const [row] = rows()

    expect(within(row!).getByText('DM')).toBeInTheDocument()
    await user.click(link(row!, 'Dana'))
    expect(router.state.location.pathname).toBe('/hands/dana')
  })

  it('links a player in the sentence by the name alone, with the suffix outside the link', () => {
    const discarded = { ...usedByAyla, returnedBy: 'dana', returnReason: 'discarded' as const }
    renderLinks({ closed: [discarded] })
    const [row] = rows()

    expect(link(row!, 'Ayla')).toHaveAttribute('href', '/hands/ayla')
    expect(row).toHaveTextContent("Ayla'nın elinden Aboleth's Eyes kartını attı.")
  })

  it('links both players of a transfer, and the account of an LP change', () => {
    renderLinks({ given: [newSide], closed: [oldSide], entries: [lpForAyla] })
    const [transfer, lp] = rows()

    expect(link(transfer!, 'Ayla')).toHaveAttribute('href', '/hands/ayla')
    expect(link(transfer!, 'Bora')).toHaveAttribute('href', '/hands/bora')
    expect(link(lp!, 'Ayla')).toHaveAttribute('href', '/hands/ayla')
  })

  it('leaves a user without a profile, the party purse and the import as text', () => {
    const toGhost = testHolding(eyes, 'ghost', 0, {
      id: 'h-ghost',
      givenAt: on(8, 0),
      givenBy: 'dana',
    })
    renderLinks({ given: [toGhost], entries: [gpForParty] })
    const [gp, ghost] = rows()

    expect(ghost).toHaveTextContent("Aboleth's Eyes kartını İsimsiz oyuncu'ya verdi.")
    expect(within(ghost!).queryByRole('link', { name: /İsimsiz/ })).toBeNull()
    expect(within(gp!).queryByRole('link', { name: /Grup kesesi/ })).toBeNull()
  })

  it('links a used card to its Kart geçmişi', async () => {
    const user = userEvent.setup()
    const { router } = renderLinks({ closed: [usedByAyla] })

    await user.click(link(rows()[0]!, "Aboleth's Eyes"))
    expect(router.state.location.pathname).toBe(cardHistoryPath(eyes))
  })

  it('links each card a pack showed, and a Custom Card a draft made', () => {
    const shown = ['A', 'B', 'C', 'D', 'E'].map((name) => testCard(name))
    const pack = testPack('ayla', { id: 'p-ayla', at: on(8, 30), offered: shown.map((c) => c.id) })
    const custom = testCustomCard('custom-1')
    const finished = testCustomDraft({
      id: 'c-ayla',
      uid: 'ayla',
      by: 'ayla',
      at: on(8, 20),
      pickTypes: ['Caster', 'Draw', 'Gold'],
      pickCosts: [3, 3, 3],
      offered: [],
      status: 'finished',
      closedAt: on(8, 21),
      closedBy: 'ayla',
      cardId: 'custom-1',
      holdingId: 'h-custom',
    })
    renderLinks({ draws: [pack, finished] }, { cards: [...shown, custom] })
    const [packRow, draftRow] = rows()

    for (const card of shown) {
      expect(link(packRow!, card.name)).toHaveAttribute('href', cardHistoryPath(card))
    }
    expect(link(draftRow!, '3-Cost Custom Card')).toHaveAttribute('href', cardHistoryPath(custom))
  })

  it('does not link a True Word', () => {
    const abyss = testTrueWord('Abyss')
    renderLinks({ uses: [testWordUse('u1', abyss, 'ayla', { at: on(8, 0) })] }, { cards: [abyss] })
    const [row] = rows()

    expect(within(row!).getByText('Abyss')).toBeInTheDocument()
    expect(within(row!).queryByRole('link', { name: 'Abyss' })).toBeNull()
    expect(link(row!, 'Ayla')).toHaveAttribute('href', '/hands/ayla')
  })

  it('links a hidden card that no one holds for the DM only, and for a player while someone holds it', () => {
    const hidden = testCard('Hidden Card', { isInLibrary: false })
    const discarded = testHolding(hidden, 'ayla', 0, {
      id: 'h-hidden',
      returnedAt: on(8, 10),
      returnedBy: 'ayla',
      returnReason: 'discarded',
    })

    const player = renderLinks({ closed: [discarded] }, { cards: [hidden] })
    expect(within(rows()[0]!).getByText('Hidden Card')).toBeInTheDocument()
    expect(within(rows()[0]!).queryByRole('link', { name: 'Hidden Card' })).toBeNull()
    player.unmount()

    const held = renderLinks(
      { closed: [discarded] },
      { cards: [hidden], holdings: [testHolding(hidden, 'bora', 0)] },
    )
    expect(link(rows()[0]!, 'Hidden Card')).toBeInTheDocument()
    held.unmount()

    renderLinks({ closed: [discarded] }, { cards: [hidden], viewer: dana })
    expect(link(rows()[0]!, 'Hidden Card')).toHaveAttribute('href', cardHistoryPath(hidden))
  })
})

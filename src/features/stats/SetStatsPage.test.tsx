import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { setMascotStem } from '@/features/art/artContext'
import type { Card } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import type { PackOpening } from '@/features/draws/schema'
import type { CardSet } from '@/features/sets/schema'
import { testPictureUrl } from '@/test/artFixtures'
import { ONLY_FROM_DM, testCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testCardsOf, testPack } from '@/test/packFixtures'
import { renderApp } from '@/test/renderApp'
import { TEST_SETS } from '@/test/setFixtures'
import { STATS_AYLA, STATS_DM, STATS_PROFILES } from '@/test/statsFixtures'

const jann = testCard('Jann In A Bottle', { rarity: 'rare', cost: '0' })
const aboleth = testCard("Aboleth's Eyes")
const gambit = testCard("Celal's Gambit", { cost: '2', text: 'A risky gambit.' })
const heist = testCard("Hüssam's Heist")
const draft = testCard("Kalisha's Multiclass", { status: 'draft' })
const dmOnly = testCard("Dionus' Double Dose", { ...ONLY_FROM_DM, rarity: 'rare' })

type Options = {
  path?: string
  asDm?: boolean
  cards?: Card[]
  holdings?: Holding[]
  packs?: PackOpening[]
  openHoldings?: Holding[]
  sets?: readonly CardSet[]
}

function renderSet({
  path = '/sets/kesqer',
  asDm = false,
  cards = [jann, aboleth, gambit, heist],
  holdings = [],
  packs = [],
  openHoldings = [],
  sets = TEST_SETS,
}: Options = {}) {
  return renderApp({
    path,
    users: { currentProfile: ready(asDm ? STATS_DM : STATS_AYLA), profiles: ready(STATS_PROFILES) },
    sets: { sets: ready([...sets]) },
    cards: { cards: ready(cards) },
    holdings: { openHoldings: ready(openHoldings) },
    stats: { records: ready({ uses: [], holdings, draws: [], packs }) },
  })
}

/** `count` closed holdings of `card`, each closed as `reason`. */
function closedHoldings(card: Card, count: number, reason: 'used' | 'discarded', prefix = '') {
  return Array.from({ length: count }, (_, index) =>
    testHolding(card, 'ayla', 1000, {
      id: `${prefix}${card.id}-${reason}-${index}`,
      returnedAt: Timestamp.fromMillis(2000),
      returnedBy: 'ayla',
      returnReason: reason,
      useCost: reason === 'used' ? 1 : null,
      useEntryId: reason === 'used' ? `e-${prefix}${card.id}-${index}` : null,
    }),
  )
}

/** A Kesqer pack opening of Ayla's, turned and ended as `status`, showing `card`. */
function packOf(
  id: string,
  card: Card,
  packType: PackOpening['packType'] = 'standard',
  overrides: Partial<PackOpening> = {},
) {
  const isCursed = packType === 'cursed'
  const offered = [card.id, 'legend-b', 'legend-c', 'legend-d', 'legend-e']
  if (isCursed) offered.push('cursed-x')
  return testPack('ayla', {
    id,
    packType,
    offered,
    revealed: offered.map((_, index) => index),
    status: 'chosen',
    closedAt: Timestamp.fromMillis(9000),
    closedBy: 'ayla',
    chosen: { cardId: 'legend-b', cardName: 'B', cardKind: 'normal', holdingId: `h-${id}` },
    cursed: isCursed ? { cardId: 'cursed-x', cardName: 'X', holdingId: `hc-${id}` } : null,
    ...overrides,
  })
}

/** The text of a stat tile: its label, value and the line under it. */
function tileText(label: string) {
  const tiles = screen.getByLabelText('Set istatistikleri')
  return within(tiles).getByText(label, { selector: 'dt' }).parentElement?.textContent
}

/** The table's rows, each as its cells' texts. */
function tableRows() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim() ?? ''))
}

describe('the Set istatistikleri page', () => {
  it('shows the set under Setler, with the link back', async () => {
    const { router } = renderSet()
    expect(screen.getByRole('heading', { level: 1, name: 'Kesqerian Nights' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('link', { name: '← Setler' }))
    expect(router.state.location.pathname).toBe('/sets')
  })

  it('says "Böyle bir set yok." for an address that names no stored set', () => {
    renderSet({ path: '/sets/nowhere' })
    expect(screen.getByText('Böyle bir set yok.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Setler' })).toBeInTheDocument()
  })

  it('shows the set with its cardback, code, layout and Cardmaker', () => {
    renderSet({
      sets: TEST_SETS.map((set) =>
        set.code === 'Kesqer'
          ? { ...set, cardback: 'sets/kesqer/0123456789.webp', mascot: 'sets/kesqer/abcdef.webp' }
          : set,
      ),
    })
    expect(screen.getByRole('img', { name: 'Kesqerian Nights cardback' })).toHaveAttribute(
      'src',
      testPictureUrl('sets/kesqer/0123456789.webp'),
    )
    expect(screen.getByText('code: Kesqer · Standart / Premium / Cursed')).toBeInTheDocument()
    expect(document.querySelector(`[data-mascot="${setMascotStem('Kesqer')}"]`)).toHaveAttribute(
      'src',
      testPictureUrl('sets/kesqer/abcdef.webp'),
    )
  })

  it('keeps the neutral back and no Cardmaker without pictures', () => {
    renderSet()
    expect(screen.queryByRole('img', { name: 'Kesqerian Nights cardback' })).toBeNull()
    expect(document.querySelector('[data-mascot]')).toBeNull()
  })

  it('shows a loading state, and a Turkish error when the records cannot be read', () => {
    const view = renderSet()
    view.setStats({ records: { status: 'loading' } })
    expect(screen.getByRole('status')).toHaveTextContent('Set istatistikleri yükleniyor…')
    view.setStats({
      records: {
        status: 'error',
        error: { kind: 'permission-denied', message: 'denied', path: 'userCards' },
      },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Setin istatistikleri yüklenemedi.')
  })
})

describe('the cards and tiles of a set', () => {
  const kesqer = testCardsOf('Kesqer', 120)

  it("counts 120 cards on a player's page, and 122 on the DM's with the marks", () => {
    const cards = [...kesqer, draft, dmOnly]
    const view = renderSet({ cards })
    expect(tileText('Kart')).toBe('Kart120aktif')
    expect(screen.getByText('120 kart')).toBeInTheDocument()
    view.unmount()

    renderSet({ cards, asDm: true })
    expect(tileText('Kart')).toBe('Kart1221 taslak · 1 🔒 DM')
    const rows = tableRows()
    expect(rows).toHaveLength(122)
    expect(rows.find((row) => row[0]?.startsWith('Kalisha'))?.[0]).toBe(
      "Kalisha's MulticlassTaslak",
    )
    expect(rows.find((row) => row[0]?.startsWith('Dionus'))?.[0]).toBe("Dionus' Double Dose🔒 DM")
  })

  it('reads the tiles: pool, hands and the opened packs by type, leaving out a cancelled pack', () => {
    const held = kesqer.slice(0, 17).map((card, index) => ({
      ...card,
      holder: { uid: 'bora', userCardId: `open-${index}` },
    })) as Card[]
    const first = kesqer[0] as Card
    renderSet({
      cards: [...held, ...kesqer.slice(17)],
      openHoldings: held.map((card, index) =>
        testHolding(card, 'bora', 1000, { id: `open-${index}` }),
      ),
      packs: [
        ...Array.from({ length: 21 }, (_, i) => packOf(`s${i}`, first)),
        ...Array.from({ length: 12 }, (_, i) => packOf(`p${i}`, first, 'premium')),
        ...Array.from({ length: 4 }, (_, i) => packOf(`c${i}`, first, 'cursed')),
        packOf('cancelled', first, 'standard', {
          status: 'cancelled',
          chosen: null,
          refundEntryId: 'refund',
        }),
      ],
    })
    expect(tileText('Kart')).toBe('Kart120aktif')
    expect(tileText('Havuzda')).toBe('Havuzda103çekilebilir')
    expect(tileText('Elde')).toBe('Elde17şu an')
    expect(tileText('Açılan pack')).toBe('Açılan pack37Standard 21 · Premium 12 · Cursed 4')
  })

  it('counts the cards never held, and sums the uses, discards and transfers', () => {
    const holdings = kesqer
      .slice(0, 62)
      .flatMap((card, index) => closedHoldings(card, 1, index < 40 ? 'used' : 'discarded'))
    renderSet({ cards: kesqer, holdings })
    expect(tileText('Hiç ele geçmedi')).toBe('Hiç ele geçmedi58kart')
    expect(tileText('Ele geçti')).toBe('Ele geçti62DM 62 · Çekiliş 0 · Paket 0')
    expect(tileText('Kullanıldı')).toBe('Kullanıldı40toplam 40 LP ödendi')
    expect(tileText('Discard')).toBe('Discard220 transfer')
  })
})

describe("the set's card table", () => {
  const records = () => ({
    uses: [],
    holdings: [
      ...closedHoldings(jann, 4, 'used'),
      ...closedHoldings(aboleth, 2, 'used'),
      ...closedHoldings(aboleth, 1, 'discarded'),
      ...closedHoldings(gambit, 1, 'used'),
      ...closedHoldings(gambit, 2, 'discarded'),
    ],
    packs: [
      ...Array.from({ length: 9 }, (_, index) =>
        packOf(`jann-${index}`, jann, 'standard', {
          chosen:
            index < 3
              ? {
                  cardId: jann.id,
                  cardName: jann.name,
                  cardKind: 'normal',
                  holdingId: `hj-${index}`,
                }
              : { cardId: 'legend-b', cardName: 'B', cardKind: 'normal', holdingId: `hb-${index}` },
        }),
      ),
    ],
  })

  it('starts with the most used card, with its pack counts', () => {
    renderSet(records())
    const rows = tableRows()
    expect(rows[0]).toEqual(['Jann In A Bottle', 'Rare', '0', '4', '4', '0', '9 / 3', 'Havuzda'])
    expect(rows.map((row) => row[0])).toEqual([
      'Jann In A Bottle',
      "Aboleth's Eyes",
      "Celal's Gambit",
      "Hüssam's Heist",
    ])
  })

  it('sorts by discards, most first, then fewest first', async () => {
    const user = userEvent.setup()
    renderSet(records())
    await user.click(screen.getByRole('button', { name: /^Discard/ }))
    expect(tableRows().map((row) => row[0])).toEqual([
      "Celal's Gambit",
      "Aboleth's Eyes",
      "Hüssam's Heist",
      'Jann In A Bottle',
    ])
    expect(screen.getByRole('columnheader', { name: /Discard/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    await user.click(screen.getByRole('button', { name: /^Discard/ }))
    expect(tableRows().map((row) => row[0])).toEqual([
      "Hüssam's Heist",
      'Jann In A Bottle',
      "Aboleth's Eyes",
      "Celal's Gambit",
    ])
  })

  it('sorts a text column alphabetically first', async () => {
    const user = userEvent.setup()
    renderSet(records())
    await user.click(screen.getByRole('button', { name: /^Kart/ }))
    expect(tableRows().map((row) => row[0])).toEqual([
      "Aboleth's Eyes",
      "Celal's Gambit",
      "Hüssam's Heist",
      'Jann In A Bottle',
    ])
  })

  it("opens a card's Kart geçmişi from its name", async () => {
    const { router } = renderSet(records())
    await userEvent.setup().click(screen.getByRole('link', { name: "Aboleth's Eyes" }))
    expect(router.state.location.pathname).toBe(`/library/${aboleth.id}`)
    expect(screen.getByRole('heading', { level: 1, name: "Aboleth's Eyes" })).toBeInTheDocument()
  })

  it('narrows the table by a search and by rarity, leaving the tiles as they were', async () => {
    const user = userEvent.setup()
    renderSet(records())
    await user.type(screen.getByRole('searchbox', { name: 'Kart ara' }), 'gambit')
    expect(tableRows().map((row) => row[0])).toEqual(["Celal's Gambit"])
    expect(screen.getByText('1 kart')).toBeInTheDocument()
    expect(tileText('Kart')).toBe('Kart4aktif')

    await user.clear(screen.getByRole('searchbox', { name: 'Kart ara' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rarity' }), 'Rare')
    expect(tableRows().map((row) => row[0])).toEqual(['Jann In A Bottle'])
  })

  it('counts a choice from a pack while the page is open', () => {
    const view = renderSet({ ...records(), asDm: true })
    expect(tableRows()[0]?.slice(3)).toEqual(['4', '4', '0', '9 / 3', 'Havuzda'])

    const chosen = packOf('new', jann, 'premium', {
      chosen: { cardId: jann.id, cardName: jann.name, cardKind: 'normal', holdingId: 'h-new' },
    })
    const holding = testHolding(jann, 'ayla', 3000, {
      id: 'h-new',
      givenBy: 'ayla',
      givenVia: 'pack',
      drawId: 'new',
    })
    const next = records()
    view.setStats({
      records: ready({
        uses: [],
        holdings: [...next.holdings, holding],
        draws: [],
        packs: [...next.packs, chosen],
      }),
    })

    expect(tableRows()[0]?.slice(3)).toEqual(['5', '4', '0', '10 / 4', 'Havuzda'])
  })
})

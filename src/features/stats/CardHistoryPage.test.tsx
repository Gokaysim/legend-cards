import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'
import type { CardRecords } from '@/features/stats/cardHistory'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import {
  ABOLETH,
  abolethHistory,
  in2026,
  STATS_AYLA,
  STATS_DM,
  STATS_PROFILES,
} from '@/test/statsFixtures'
import type { Subscription } from '@/lib/firestore/subscription'

const curse = testCursedCard('Abandon All Hope')
const jann = testCard('Jann In A Bottle', { rarity: 'rare', cost: '0', holder: null })
const wish = testCard('The Last Wish', { dmOnly: true })
const draft = testCard("Kalisha's Multiclass", { status: 'draft' })
const retired = testCard('Old Trick', { status: 'retired' })
const CARDS = [ABOLETH, curse, jann, wish, draft, retired]

type Options = {
  path?: string
  asDm?: boolean
  records?: Subscription<CardRecords>
  openHoldings?: Holding[]
  cards?: Card[]
}

function renderHistory({
  path = `/library/${ABOLETH.id}`,
  asDm = false,
  records = ready(abolethHistory()),
  openHoldings = [],
  cards = CARDS,
}: Options = {}) {
  return renderApp({
    path,
    users: { currentProfile: ready(asDm ? STATS_DM : STATS_AYLA), profiles: ready(STATS_PROFILES) },
    cards: { cards: ready(cards) },
    holdings: { openHoldings: ready(openHoldings) },
    stats: { records },
  })
}

describe('who opens a card page', () => {
  it('shows a player "Kart bulunamadı." for a draft, with the link back', () => {
    renderHistory({ path: `/library/${draft.id}` })
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Kart kütüphanesi' })).toBeInTheDocument()
  })

  it('shows a player a DM-only card someone holds', () => {
    renderHistory({
      path: `/library/${wish.id}`,
      openHoldings: [testHolding(wish, 'bora', in2026(11, 10))],
      records: ready({
        holdings: [testHolding(wish, 'bora', in2026(11, 10))],
        draws: [],
        packs: [],
      }),
    })
    expect(screen.getByRole('heading', { level: 1, name: 'The Last Wish' })).toBeInTheDocument()
  })

  it('shows a player "Kart bulunamadı." for a DM-only or retired card no one holds', () => {
    renderHistory({ path: `/library/${wish.id}` })
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
  })

  it('shows a player a retired card while someone holds it', () => {
    renderHistory({
      path: `/library/${retired.id}`,
      openHoldings: [testHolding(retired, 'bora', in2026(11, 10))],
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Old Trick' })).toBeInTheDocument()
    expect(screen.getByText('Kaldırıldı')).toBeInTheDocument()
  })

  it('hides a retired card no one holds from a player', () => {
    renderHistory({ path: `/library/${retired.id}` })
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
  })

  it('shows the DM a draft, with the pill "Taslak"', () => {
    renderHistory({ path: `/library/${draft.id}`, asDm: true })
    expect(
      screen.getByRole('heading', { level: 1, name: "Kalisha's Multiclass" }),
    ).toBeInTheDocument()
    expect(screen.getByText('Taslak')).toBeInTheDocument()
  })

  it('says "Kart bulunamadı." for an unknown card and for the wrong screen of a card', () => {
    renderHistory({ path: '/library/legend-nothing' })
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
  })

  it('does not show a Legend card under the Cursed Deck', () => {
    renderHistory({ path: `/cursed-deck/${ABOLETH.id}` })
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Cursed Deck' })).toBeInTheDocument()
  })
})

describe('loading and errors', () => {
  it('shows a loading state while the records load', () => {
    renderHistory({ records: { status: 'loading' } })
    expect(screen.getByRole('status')).toHaveTextContent('Kart geçmişi yükleniyor…')
  })

  it("says in Turkish that the card's history could not be loaded", () => {
    renderHistory({
      records: {
        status: 'error',
        error: { kind: 'permission-denied', message: 'denied', path: 'userCards' },
      },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Kartın geçmişi yüklenemedi.')
  })
})

describe('the card on its page', () => {
  it('shows a card in the pool with its face, heading, labels and pill', () => {
    renderHistory({ records: ready({ holdings: [], draws: [], packs: [] }) })
    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: "Aboleth's Eyes" })).toBeInTheDocument()
    const labels = within(screen.getByRole('list', { name: 'Kart bilgileri' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(labels).toEqual(['Kesqerian Nights', 'Common', 'Cost 1', 'Arcanus Divine'])
    expect(document.querySelector('[data-status-pill]')).toHaveTextContent('Havuzda')
  })

  it('names the holder of a held card in its pill', () => {
    const held = { ...jann, holder: { uid: 'bora', userCardId: 'h-jann' } } as Card
    renderHistory({
      path: `/library/${jann.id}`,
      cards: [ABOLETH, held],
      openHoldings: [testHolding(jann, 'bora', in2026(11, 10), { id: 'h-jann' })],
    })
    expect(document.querySelector('[data-status-pill]')).toHaveTextContent('Elde: Bora')
  })

  it('shows a Cursed card under the Cursed Deck, with "Cursed" and its cost', () => {
    renderHistory({ path: `/cursed-deck/${curse.id}` })
    expect(screen.getByRole('heading', { level: 1, name: 'Abandon All Hope' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Cursed Deck' })).toBeInTheDocument()
    const labels = within(screen.getByRole('list', { name: 'Kart bilgileri' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(labels).toEqual(['Cursed', 'Cost 1'])
  })
})

describe('the stat tiles and the Geçmiş list', () => {
  it('counts a card with a history', () => {
    renderHistory()
    expect(tileText('Ele geçti')).toBe('Ele geçti3DM 1 · Çekiliş 1 · Paket 1')
    expect(tileText('Kullanıldı')).toBe('Kullanıldı2toplam 2 LP ödendi')
    expect(tileText('Discard')).toBe('Discard1DM attı')
    expect(tileText('Transfer')).toBe('Transfer1el değiştirdi')
    expect(tileText('Pakette göründü')).toBe('Pakette göründü21 kez seçildi')
    expect(tileText('Farklı oyuncu')).toBe('Farklı oyuncu3Ayla, Bora, Dana')
    expect(tileText('Elde kaldı')).toBe('Elde kaldı14 günortalama 3,5 gün')
    expect(tileText('Son kullanım')).toBe('Son kullanım14 Kas 2026ilk kez 20 Eki 2026')
  })

  it("lists what happened, newest first, with each row's details", () => {
    renderHistory()
    const list = screen.getByRole('region', { name: 'Geçmiş' })
    expect(within(list).getByText('8 olay')).toBeInTheDocument()
    expect(rowTexts()).toEqual([
      'Ayla kullandı',
      "Ayla, Kesqerian Nights Premium Pack'ten seçti",
      "Bora'nın Kesqerian Nights Standard Pack'inde göründü",
      "Ayla'nın elinden discard edildi",
      "Bora'dan Ayla'ya transfer edildi",
      'Bora çekti',
      'Dana kullandı',
      "DM, Dana'ya verdi",
    ])
    expect(within(list).getByText('Kael üzerinde · 1 LP · kart havuza döndü')).toBeInTheDocument()
    expect(within(list).getByText('Seçilmedi')).toBeInTheDocument()
    expect(within(list).getByText('Rastgele çekiliş · 1 LP')).toBeInTheDocument()
  })

  it('groups the rows under their days, newest day first', () => {
    renderHistory()
    const days = within(screen.getByRole('region', { name: 'Geçmiş' }))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(days.slice(0, 3)).toEqual(['14 Kasım 2026', '12 Kasım 2026', '9 Kasım 2026'])
    const use = screen.getByRole('region', { name: '14 Kasım 2026' })
    expect(within(use).getByText('Ayla kullandı')).toBeInTheDocument()
    const choice = screen.getByRole('region', { name: '12 Kasım 2026' })
    expect(within(choice).getByText(/Premium Pack'ten seçti/)).toBeInTheDocument()
  })

  it('shows zeros and "Bu kart henüz kimsenin eline geçmedi." for a card never given', () => {
    renderHistory({ records: ready({ holdings: [], draws: [], packs: [] }) })
    expect(tileText('Ele geçti')).toBe('Ele geçti0henüz yok')
    expect(tileText('Pakette göründü')).toBe('Pakette göründü0—')
    expect(tileText('Farklı oyuncu')).toBe('Farklı oyuncu0—')
    expect(tileText('Elde kaldı')).toBe('Elde kaldı——')
    expect(tileText('Son kullanım')).toBe('Son kullanım—hiç ele geçmedi')
    expect(screen.getByText('Bu kart henüz kimsenin eline geçmedi.')).toBeInTheDocument()
  })

  it('shows a use made on another device without a reload', () => {
    const history = abolethHistory()
    const opened = history.holdings.map((holding) =>
      holding.id === 'h-pack'
        ? {
            ...holding,
            returnedAt: null,
            returnedBy: null,
            returnReason: null,
            usedOn: null,
            useCost: null,
            useEntryId: null,
          }
        : holding,
    )
    const view = renderHistory({ records: ready({ ...history, holdings: opened }) })
    expect(tileText('Kullanıldı')).toBe('Kullanıldı1toplam 1 LP ödendi')
    expect(rowTexts()[0]).toBe("Ayla, Kesqerian Nights Premium Pack'ten seçti")

    const used = history.holdings.map((holding) =>
      holding.id === 'h-pack' ? { ...holding, returnedAt: null } : holding,
    )
    view.setStats({ records: ready({ ...history, holdings: used }) })

    expect(tileText('Kullanıldı')).toBe('Kullanıldı2toplam 2 LP ödendi')
    expect(rowTexts()[0]).toBe('Ayla kullandı')
    expect(screen.getByText('şimdi')).toBeInTheDocument()
  })
})

/** The text of a stat tile: its label, value and the line under it. */
function tileText(label: string) {
  const tiles = screen.getByLabelText('Kart istatistikleri')
  return within(tiles).getByText(label, { selector: 'dt' }).parentElement?.textContent
}

/** The first line of each row of the Geçmiş list, in order. */
function rowTexts() {
  return within(screen.getByRole('region', { name: 'Geçmiş' }))
    .getAllByRole('listitem')
    .map((row) => row.querySelector('p')?.textContent)
}

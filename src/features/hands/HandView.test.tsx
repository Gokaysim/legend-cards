import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { stubWideWindow } from '@/test/media'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

import { handEntries } from './handEntries'
import { HandTable } from './HandTable'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const profiles = ready([testProfile(), ayla, bora])

const owl = testCard('Night Owl', { setCode: 'Kesqer', cost: '3', hasHeldEffect: true })
const greedy = testCard('Greedy Hands', {
  setCode: 'Kesqer',
  text: 'Discard a card, then draw two.',
})
const letGo = testCard('Let Go', { setCode: 'Havenholm', rarity: 'rare' })
const oath = testCard('Old Oath', { setCode: 'Kesqer' })
const visions = testCursedCard('Visions of Death', { text: 'Held: [meta] Every hour draw.' })
const halo = testBlessedCard('Halo of Kings')

/** Ayla is the holder of every normal card here, except `greedy`, which Bora holds and Ayla has a copy of. */
const held = (card: typeof owl, uid: string, holdingId: string) =>
  card.kind === 'normal' ? { ...card, holder: { uid, userCardId: holdingId } } : card

const handFaces = () =>
  within(screen.getByRole('list', { name: 'Eldeki kartlar' }))
    .getAllByRole('article')
    .map((face) => face.getAttribute('aria-label'))

function renderHand(
  holdings: ReturnType<typeof testHolding>[],
  cards = [owl, greedy, letGo, oath, visions, halo],
) {
  return renderApp({
    path: '/hands/ayla',
    users: { profiles },
    cards: { cards: ready(cards) },
    holdings: { openHoldings: ready(holdings) },
  })
}

describe('hand contents', () => {
  it("shows only the player's open holdings, in the order they were received", () => {
    renderHand([
      testHolding(letGo, 'ayla', 2000),
      testHolding(owl, 'ayla', 1000),
      testHolding(visions, 'bora', 500),
      testHolding(visions, 'ayla', 3000),
    ])

    expect(handFaces()).toEqual(['Night Owl', 'Let Go', 'Visions of Death'])
    expect(screen.getByText('3 kart · alınış sırası')).toBeInTheDocument()
  })

  it('lays the cards out as a deck: tilting faces, every few at a slight angle, and an active card glowing', () => {
    renderHand([
      testHolding(owl, 'ayla', 1000, { active: true }),
      testHolding(letGo, 'ayla', 2000),
      testHolding(oath, 'ayla', 3000),
    ])

    const list = screen.getByRole('list', { name: 'Eldeki kartlar' })
    expect(list).toHaveAttribute('data-deck', 'hand')
    const items = within(list).getAllByRole('listitem')
    for (const item of items) {
      expect(item).toHaveClass('w-(--deck-card-width)', 'hover:z-30', 'focus-within:z-30')
      expect(item.querySelector('.card-tilt')).not.toBeNull()
    }
    expect(items[1]).toHaveClass('motion-safe:nth-[5n+2]:rotate-[-0.35deg]')
    const nightOwl = within(list).getByRole('article', { name: 'Night Owl' })
    expect(nightOwl.closest('[data-glow]')).toHaveAttribute('data-glow', 'active')
    expect(within(nightOwl).getByText('● Aktif')).toBeInTheDocument()
  })

  it('marks active cards, notes, extra copies and the cost in the hand on the faces', () => {
    const copy = testHolding(greedy, 'ayla', 1000, { note: 'Boss savaşında kullan' })
    renderHand(
      [testHolding(owl, 'ayla', 2000, { active: true, costOverride: '1' }), copy],
      [held(owl, 'ayla', 'ayla:legend-nightowl'), held(greedy, 'bora', 'bora-greedy')],
    )

    const owlFace = screen.getByRole('article', { name: 'Night Owl' })
    expect(owlFace).toHaveTextContent('● Aktif')
    expect(owlFace).toHaveTextContent('Cost: 1')
    expect(owlFace).toHaveTextContent('bu elde daha düşük')
    expect(owlFace).not.toHaveTextContent('Ek kopya')
    const greedyFace = screen.getByRole('article', { name: 'Greedy Hands' })
    // The note is the icon in the face's corner, read by screen readers as "Not var", not a mark.
    expect(within(greedyFace).getByText('Not var')).toHaveClass('sr-only')
    expect(greedyFace.querySelector('[data-note-icon]')).toHaveTextContent('✎')
    expect(greedyFace).toHaveTextContent('Ek kopya')
    expect(owlFace.querySelector('[data-note-icon]')).toBeNull()
  })

  it("opens a card's details from its face, and only the zoom view from its magnifier", async () => {
    const user = userEvent.setup()
    renderHand([testHolding(owl, 'ayla', 1000)])

    await user.click(screen.getByRole('button', { name: 'Night Owl: büyüt' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const zoom = screen.getByRole('dialog', { name: 'Night Owl' })
    expect(zoom).not.toHaveTextContent('Kesqerian Nights · Cost 3 · Common')
    expect(zoom).not.toHaveTextContent('Kart notu')

    await user.click(within(zoom).getByRole('button', { name: 'Kapat' }))
    await user.click(screen.getByRole('button', { name: 'Night Owl: ayrıntılar' }))

    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toHaveTextContent('Kart notu')
  })

  it('closes the zoom view when the card leaves the hand on another device', async () => {
    const user = userEvent.setup()
    const { setHoldings } = renderHand([
      testHolding(owl, 'ayla', 1000),
      testHolding(letGo, 'ayla', 2000),
    ])
    await user.click(screen.getByRole('button', { name: 'Night Owl: büyüt' }))
    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toBeInTheDocument()

    // The DM discards Night Owl: its holding is no longer open.
    setHoldings({ openHoldings: ready([testHolding(letGo, 'ayla', 2000)]) })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(handFaces()).toEqual(['Let Go'])
  })

  it('lists the hand with the #, Kart, Set, Cost, Rarity, Mechanic Pack, Metin and Durum columns', async () => {
    const user = userEvent.setup()
    renderHand(
      [
        testHolding(owl, 'ayla', 1000, { active: true, costOverride: 'X', note: 'Not' }),
        testHolding(visions, 'ayla', 2000),
        testHolding(greedy, 'ayla', 3000),
      ],
      [held(owl, 'ayla', 'ayla:legend-nightowl'), visions, held(greedy, 'bora', 'other')],
    )

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '#',
      'Kart',
      'Set',
      'Cost',
      'Rarity',
      'Mechanic Pack',
      'Metin',
      'Durum',
    ])
    const [, owlRow, visionsRow, greedyRow] = screen.getAllByRole('row')
    expect(
      within(owlRow!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      '1',
      'Kesqerian Nights',
      'X',
      'Common',
      'Arcanus Divine',
      'Night Owl text.',
      '● Aktif',
    ])
    expect(within(owlRow!).getByRole('rowheader')).toHaveTextContent('Night Owl✎(not var)')
    expect(visionsRow).toHaveTextContent('Held: Every hour draw.')
    expect(visionsRow).toHaveTextContent('Elde☠ Cursed')
    expect(greedyRow).toHaveTextContent('EldeEk kopya')
  })

  it('shows a card the DM gives while the hand is open, without a reload', () => {
    const { setHoldings } = renderHand([testHolding(owl, 'ayla', 1000)])
    expect(handFaces()).toEqual(['Night Owl'])

    setHoldings({
      openHoldings: ready([testHolding(owl, 'ayla', 1000), testHolding(letGo, 'ayla', 2000)]),
    })

    expect(handFaces()).toEqual(['Night Owl', 'Let Go'])
  })

  it('says so when the hand has no cards yet', () => {
    renderHand([testHolding(owl, 'bora', 1000)])

    expect(screen.getByText('Bu elde henüz kart yok.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Eldeki kartlar' })).not.toBeInTheDocument()
  })

  it('keeps a retired card in the hand, while the library no longer lists it', async () => {
    const user = userEvent.setup()
    const retired: Card = { ...owl, status: 'retired' }
    renderHand([testHolding(owl, 'ayla', 1000)], [retired, letGo])

    expect(handFaces()).toEqual(['Night Owl'])

    await user.click(screen.getByRole('link', { name: 'Kütüphane' }))
    expect(screen.queryByRole('article', { name: 'Night Owl' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Let Go' })).toBeInTheDocument()
  })

  it('shows a loading state, then an error when the hand cannot be read', () => {
    const { setHoldings } = renderApp({
      path: '/hands/ayla',
      users: { profiles },
      holdings: { openHoldings: { status: 'loading' } },
    })
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('El yükleniyor…')

    setHoldings({
      openHoldings: {
        status: 'error',
        error: { kind: 'permission-denied', message: 'x', path: 'userCards' },
      },
    })
    expect(within(screen.getByRole('main')).getByRole('alert')).toHaveTextContent('El yüklenemedi.')
  })
})

/** The value of a stat in the hand summary, by its label without its "ⓘ". */
function stat(label: string) {
  const term = within(screen.getByLabelText('El özeti'))
    .getAllByRole('term')
    .find((candidate) => candidate.textContent.replace(/\s*ⓘ$/, '') === label)
  return term?.parentElement?.querySelector('dd')?.textContent
}

/** The Cursed and True Words counts, as a screen reader reads the third stat. */
const cursedAndWords = (cursed: number, words: number) =>
  `☠ Cursed kart: ${cursed}✦ True Words: ${words}`

/** The sets list of the summary, whether it shows or not. */
const setsList = () => screen.getByRole('region', { name: /^Eldeki setler/ })
const listTrigger = (name: string) =>
  within(screen.getByLabelText('El özeti')).getByRole('button', { name })

describe('double-clicking a hand card', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects the card beside the hand and opens its zoom view over the panel on a wide window', async () => {
    stubWideWindow()
    const user = userEvent.setup()
    renderHand([testHolding(owl, 'ayla', 1000)])

    await user.dblClick(screen.getByRole('button', { name: 'Night Owl: ayrıntılar' }))

    expect(screen.getByRole('region', { name: 'Seçili Kart' })).toHaveTextContent('Kart notu')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Night Owl' })).not.toHaveTextContent('Kart notu')
  })

  it('opens only the details dialog on a narrower window', async () => {
    const user = userEvent.setup()
    renderHand([testHolding(owl, 'ayla', 1000)])

    await user.dblClick(screen.getByRole('button', { name: 'Night Owl: ayrıntılar' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toHaveTextContent('Kart notu')
  })
})

describe('hand summary', () => {
  it('counts the cards and the Cursed cards, and lists the sets', () => {
    renderHand([
      testHolding(owl, 'ayla', 1000, { active: true }),
      testHolding(greedy, 'ayla', 2000),
      testHolding(oath, 'ayla', 3000),
      testHolding(letGo, 'ayla', 4000),
      testHolding(visions, 'ayla', 5000, { active: true }),
    ])

    expect(stat('Kartlar')).toBe('5')
    expect(stat('Cursed · TW')).toBe(cursedAndWords(1, 0))

    // Closed, the list still reads for screen readers, headed with how many sets there are.
    expect(setsList()).toHaveAccessibleName('Eldeki setler · 2 set')
    expect(
      within(setsList())
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Kesqerian Nights3 kart', 'Throne of Havenholm1 kart'])
  })

  it('shows three stats and no active effects', () => {
    renderHand([testHolding(owl, 'ayla', 1000, { active: true })])

    const terms = within(screen.getByLabelText('El özeti'))
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(terms).toEqual(['Legend Point', 'Kartlar ⓘ', 'Cursed · TW'])
    expect(screen.queryByRole('region', { name: /Aktif Efektler/i })).toBeNull()
    expect(within(screen.getByLabelText('El özeti')).queryByText(/Aktif efekt/)).toBeNull()
  })

  it('counts the True Words beside the Cursed cards, and never as cards', () => {
    const abyss = testTrueWord('Abyss', { text: 'Free card.', hasHeldEffect: true })
    const aid = testTrueWord('Aid')
    const chaos = testTrueWord('Chaos', { hasHeldEffect: true })
    renderApp({
      path: '/hands/ayla',
      users: { profiles },
      cards: { cards: ready([owl, greedy, letGo, oath, visions]) },
      holdings: {
        openHoldings: ready([
          testHolding(owl, 'ayla', 1000, { active: true }),
          testHolding(greedy, 'ayla', 2000),
          testHolding(oath, 'ayla', 3000),
          testHolding(letGo, 'ayla', 4000),
          testHolding(visions, 'ayla', 5000, { active: true }),
        ]),
      },
      trueWords: {
        words: ready([abyss, aid, chaos]),
        knownWords: ready([
          testLearnedWord('r1', abyss, 'ayla', { active: true }),
          testLearnedWord('r2', aid, 'ayla'),
          testLearnedWord('r3', chaos, 'ayla'),
          testLearnedWord('r4', chaos, 'bora', { active: true }),
        ]),
      },
    })

    expect(stat('Kartlar')).toBe('5')
    expect(stat('Cursed · TW')).toBe(cursedAndWords(1, 3))
  })

  it('shows both counts at 0, and does not count Blessed cards as a set', () => {
    renderHand([testHolding(halo, 'ayla', 1000)])

    expect(stat('Cursed · TW')).toBe(cursedAndWords(0, 0))
    expect(setsList()).toHaveAccessibleName('Eldeki setler · 0 set')
    expect(within(setsList()).getByText('Henüz set yok.')).toBeInTheDocument()
  })

  it('colors the counts, keeps the stats in one row, and marks the stat that opens a list', () => {
    renderHand([])

    const summary = screen.getByLabelText('El özeti')
    expect(summary).toHaveClass('grid-cols-3')
    const tile = (label: string) =>
      within(summary)
        .getAllByRole('term')
        .find((term) => term.textContent.startsWith(label))
        ?.closest('[data-tone]')
    expect(tile('Cursed')).toHaveAttribute('data-tone', 'cursed-word')
    expect(tile('Legend Point')).toHaveAttribute('data-tone', 'plain')
    expect(tile('Kartlar')).toHaveAttribute('data-tone', 'plain')
    expect(tile('Kartlar')).toHaveTextContent('Kartlar ⓘ')
    expect(within(summary).getByText('Cursed kart:').parentElement).toHaveClass(
      'text-stat-cursed-ink',
      'text-shadow-glow-cursed',
    )
    expect(within(summary).getByText('True Words:').parentElement).toHaveClass(
      'text-true-word',
      'text-shadow-glow-word',
    )
  })
})

describe('opening the sets list', () => {
  const isOpen = () => setsList().hasAttribute('data-open')
  const trigger = () => listTrigger('Eldeki setler')

  it('keeps the list closed, as sr-only, until the stat is pointed at, focused or tapped', () => {
    renderHand([testHolding(owl, 'ayla', 1000, { active: true })])

    expect(setsList()).toHaveClass('sr-only')
  })

  it('opens the list while the mouse rests on the stat', () => {
    renderHand([testHolding(owl, 'ayla', 1000, { active: true })])

    fireEvent.pointerEnter(trigger(), { pointerType: 'mouse' })
    expect(isOpen()).toBe(true)
    expect(setsList()).not.toHaveClass('sr-only')

    fireEvent.pointerLeave(trigger(), { pointerType: 'mouse' })
    expect(isOpen()).toBe(false)
  })

  it('keeps a list the mouse opened open when the stat is clicked', () => {
    renderHand([testHolding(owl, 'ayla', 1000)])

    fireEvent.pointerEnter(trigger(), { pointerType: 'mouse' })
    fireEvent.pointerDown(trigger(), { pointerType: 'mouse' })
    fireEvent.click(trigger(), { detail: 1 })

    expect(isOpen()).toBe(true)
  })

  it('ignores a touch resting on the stat, and toggles the list with taps', () => {
    renderHand([testHolding(owl, 'ayla', 1000)])

    fireEvent.pointerEnter(trigger(), { pointerType: 'touch' })
    expect(isOpen()).toBe(false)

    // A tap may focus the button (Android) before its click: the click alone decides.
    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    act(() => trigger().focus())
    expect(isOpen()).toBe(false)
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(true)

    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(false)
  })

  it('closes a tapped list with a press elsewhere, or with Escape', () => {
    renderHand([testHolding(owl, 'ayla', 1000)])

    fireEvent.click(trigger())
    expect(isOpen()).toBe(true)
    fireEvent.pointerDown(document.body, { pointerType: 'touch' })
    expect(isOpen()).toBe(false)

    fireEvent.click(trigger())
    expect(isOpen()).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isOpen()).toBe(false)
  })

  it('opens the list while the stat has the keyboard focus', async () => {
    const user = userEvent.setup()
    renderHand([testHolding(owl, 'ayla', 1000)])

    act(() => trigger().focus())
    await user.tab({ shift: true })
    await user.tab()
    expect(trigger()).toHaveFocus()
    expect(isOpen()).toBe(true)

    await user.tab()
    expect(isOpen()).toBe(false)
  })
})

describe('the selected card in the list view', () => {
  it("raises the selected card's row with a gold edge, and marks its name as current", () => {
    const holdings = [testHolding(owl, 'ayla', 1000), testHolding(oath, 'ayla', 2000)]
    const cardsById = new Map([owl, oath].map((card) => [card.id, card]))
    const entries = handEntries(holdings, cardsById, 'ayla')
    render(<HandTable entries={entries} onSelect={vi.fn()} selectedId={holdings[1]!.id} />)

    const [, owlRow, oathRow] = screen.getAllByRole('row')
    expect(oathRow).toHaveAttribute('data-selected', 'true')
    expect(oathRow).toHaveClass('bg-pane-raised')
    expect(within(oathRow!).getAllByRole('cell')[0]).toHaveClass('border-l-gold')
    expect(within(oathRow!).getByRole('button', { name: 'Old Oath' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(owlRow).not.toHaveAttribute('data-selected')
    expect(within(owlRow!).getByRole('button', { name: 'Night Owl' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})

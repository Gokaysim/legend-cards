import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const profiles = ready([testProfile(), ayla, bora])

const owl = testCard('Night Owl', { setCode: 'Kesqer', cost: '3' })
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
    expect(greedyFace).toHaveTextContent('Not var')
    expect(greedyFace).toHaveTextContent('Ek kopya')
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
    const retired = { ...owl, retired: true }
    renderHand([testHolding(owl, 'ayla', 1000)], [retired, letGo])

    expect(handFaces()).toEqual(['Night Owl'])

    await user.click(screen.getByRole('link', { name: 'Kart kütüphanesi' }))
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

describe('hand summary', () => {
  it('counts the cards, the active ones, the sets and the Cursed cards, and lists them', () => {
    renderHand([
      testHolding(owl, 'ayla', 1000, { active: true }),
      testHolding(greedy, 'ayla', 2000),
      testHolding(oath, 'ayla', 3000),
      testHolding(letGo, 'ayla', 4000),
      testHolding(visions, 'ayla', 5000, { active: true }),
    ])

    const stats = within(screen.getByLabelText('El özeti'))
    const stat = (label: string) => stats.getByText(label).nextElementSibling?.textContent
    expect(stat('Eldeki kart')).toBe('5')
    expect(stat('Aktif efekt')).toBe('2')
    expect(stat('Farklı set')).toBe('2')
    expect(stat('☠ Cursed kart')).toBe('1')

    const effects = within(screen.getByRole('region', { name: 'Aktif efektler' }))
    expect(effects.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Night OwlNight Owl text.',
      '☠ Cursed: Visions of DeathHeld: Every hour draw.',
    ])

    const sets = within(screen.getByRole('region', { name: 'Setler' }))
    expect(sets.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Kesqerian Nights3 kart',
      'Throne of Havenholm1 kart',
    ])
  })

  it('counts the True Words and their active ones, lists them after the cards, and never as cards', () => {
    const abyss = testTrueWord('Abyss', { text: 'Free card.' })
    const aid = testTrueWord('Aid')
    const chaos = testTrueWord('Chaos')
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

    const stats = within(screen.getByLabelText('El özeti'))
    const stat = (label: string) => stats.getByText(label).nextElementSibling?.textContent
    expect(stat('Eldeki kart')).toBe('5')
    expect(stat('Aktif efekt')).toBe('3')
    expect(stat('✦ True Words')).toBe('3')

    const effects = within(screen.getByRole('region', { name: 'Aktif efektler' }))
    expect(effects.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Night OwlNight Owl text.',
      '☠ Cursed: Visions of DeathHeld: Every hour draw.',
      '✦ True Word: AbyssFree card.',
    ])
  })

  it('does not count Blessed cards as a set', () => {
    renderHand([testHolding(halo, 'ayla', 1000)])

    const stats = within(screen.getByLabelText('El özeti'))
    expect(stats.getByText('Farklı set').nextElementSibling).toHaveTextContent('0')
    expect(screen.getByText('Henüz set yok.')).toBeInTheDocument()
    expect(screen.getByText('Aktif efekt yok.')).toBeInTheDocument()
  })
})

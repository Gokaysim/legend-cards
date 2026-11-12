import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { StatusFilterValue } from '@/features/definitions/statusFilterOptions'
import type { Subscription } from '@/lib/firestore/subscription'
import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { CardBrowser } from './CardBrowser'
import type { Card } from './schema'
import type { CardStatus, DeckStatus } from './status'

const LEGEND: Card[] = [
  testCard('Greedy Hands', {
    setCode: 'Kesqer',
    mechanicPack: 'Risk & Reward',
    text: 'Discard a card, then draw two.',
  }),
  testCard('Let Go', {
    setCode: 'Havenholm',
    mechanicPack: 'Risk & Reward',
    text: 'Discard your hand.',
  }),
  testCard("Brünn's Batallion", {
    setCode: 'The End Is Nigh',
    mechanicPack: 'Blood & Battle',
    rarity: 'rare',
    text: 'Allies gain +1 to attack.',
  }),
  testCard("Hrolf's Hornswaggle", {
    setCode: 'Havenholm',
    mechanicPack: "Dungeoneer's Kit",
    cost: null,
    text: '[Uno] Add +10 a d20 roll. If this is your only card, add +20.',
  }),
  testCard('Pandemonic Roar', { setCode: 'Pandemonium', mechanicPack: 'Arcanus Divine' }),
  testCard('Strange Find', { setCode: 'Ulagal', mechanicPack: 'Permamancy' }),
  testBlessedCard('Dawn of Fortune', { mechanicPack: 'Risk & Reward' }),
  testBlessedCard('Halo of Kings', { mechanicPack: 'Legends of Old' }),
]

const CURSED: Card[] = [
  testCursedCard('Visions of Death', { text: 'Held: Every hour draw a cursed card.' }),
  testCursedCard('Heart Attack', { text: 'Drawn: Make a Fortitude Check or die.' }),
]

const shownNames = () =>
  within(screen.getByRole('list', { name: 'Kartlar' }))
    .queryAllByRole('article')
    .map((card) => card.getAttribute('aria-label'))

const options = (name: string) =>
  within(screen.getByRole('combobox', { name }))
    .getAllByRole('option')
    .map((option) => option.textContent)

const search = () => screen.getByRole('searchbox', { name: 'Kart ara' })

describe('CardBrowser states', () => {
  it('shows a loading indicator while the cards load', () => {
    render(<CardBrowser deck="legend" cards={{ status: 'loading' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Kartlar yükleniyor…')
  })

  it('shows a Turkish error and no list when the cards cannot be read', () => {
    render(
      <CardBrowser
        deck="cursed"
        cards={{
          status: 'error',
          error: { kind: 'permission-denied', message: 'denied', path: 'cards' },
        }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Kartlar yüklenemedi.')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('points to the import when the stored data is invalid', () => {
    render(
      <CardBrowser
        deck="legend"
        cards={{
          status: 'error',
          error: { kind: 'invalid-data', message: 'bad', path: 'cards/legend-x' },
        }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('import')
  })

  it('says so when there are no cards at all', () => {
    render(<CardBrowser deck="cursed" cards={ready([])} />)
    expect(screen.getByText('Henüz kart yok.')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})

describe('CardBrowser for the Legend deck', () => {
  it('lists every card in name order and says how many it shows', () => {
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    expect(screen.getByText('8 kart')).toBeInTheDocument()
    expect(shownNames()).toEqual([
      "Brünn's Batallion",
      'Dawn of Fortune',
      'Greedy Hands',
      'Halo of Kings',
      "Hrolf's Hornswaggle",
      'Let Go',
      'Pandemonic Roar',
      'Strange Find',
    ])
  })

  it('lays the card view out as a deck of tilting faces, every few at a slight angle', () => {
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    const list = screen.getByRole('list', { name: 'Kartlar' })
    expect(list).toHaveAttribute('data-deck', 'library')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(8)
    for (const item of items) expect(item.querySelector('.card-tilt')).not.toBeNull()
    expect(items[1]).toHaveClass('motion-safe:nth-[7n+2]:rotate-[-0.3deg]')
  })

  it('needs every comma-separated term to match, and counts the matches', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.type(search(), 'discard, draw')

    expect(shownNames()).toEqual(['Greedy Hands'])
    expect(screen.getByText('1 kart (toplam 8)')).toBeInTheDocument()
  })

  it('ignores accents and case', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.type(search(), 'BRUNN')

    expect(shownNames()).toEqual(["Brünn's Batallion"])
  })

  it('finds cards by the official set name', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.type(search(), 'Kesqerian')

    expect(shownNames()).toEqual(['Greedy Hands'])
  })

  it('hides bracket text but still finds it', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    expect(screen.getByRole('article', { name: "Hrolf's Hornswaggle" })).toHaveTextContent(
      'Add +10 a d20 roll. If this is your only card, add +20.',
    )
    expect(screen.queryByText(/Uno/)).not.toBeInTheDocument()

    await user.type(search(), 'uno')
    expect(shownNames()).toEqual(["Hrolf's Hornswaggle"])
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.type(search(), 'no such card anywhere')

    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Kartlar' })).not.toBeInTheDocument()
    expect(screen.getByText('0 kart (toplam 8)')).toBeInTheDocument()
  })

  it('offers the sets in shop order with official names, Pandemonium last among sets, then Blessed', () => {
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)
    expect(options('Set')).toEqual([
      'Tüm setler',
      'The End is Nigh',
      'Kesqerian Nights',
      'Throne of Havenholm',
      'Ballad of Ulagal',
      'Pandemonium',
      'Blessed',
    ])
  })

  it('puts a set code without an official name after the known sets, as written', () => {
    render(
      <CardBrowser
        deck="legend"
        cards={ready([
          testCard('Odd', { setCode: 'Kesqeria' }),
          testCard('Owl', { setCode: 'Kesqer' }),
        ])}
      />,
    )
    expect(options('Set')).toEqual(['Tüm setler', 'Kesqerian Nights', 'Kesqeria'])
  })

  it('offers the mechanic packs in Turkish alphabetical order', () => {
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)
    expect(options('Mechanic Pack')).toEqual([
      'Tüm mechanicler',
      'Arcanus Divine',
      'Blood & Battle',
      "Dungeoneer's Kit",
      'Legends of Old',
      'Permamancy',
      'Risk & Reward',
    ])
  })

  it('filters by set, and shows only the Blessed cards for "Blessed"', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Set' }), 'Throne of Havenholm')
    expect(shownNames()).toEqual(["Hrolf's Hornswaggle", 'Let Go'])
    expect(screen.getByText('2 kart (toplam 8)')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Set' }), 'Blessed')
    expect(shownNames()).toEqual(['Dawn of Fortune', 'Halo of Kings'])
  })

  it('combines the set filter, the mechanic pack filter and the search', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Mechanic Pack' }),
      'Risk & Reward',
    )
    expect(shownNames()).toEqual(['Dawn of Fortune', 'Greedy Hands', 'Let Go'])

    await user.selectOptions(screen.getByRole('combobox', { name: 'Set' }), 'Throne of Havenholm')
    expect(shownNames()).toEqual(['Let Go'])

    await user.type(search(), 'draw')
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
  })

  it('switches to the list view with the same search and filters, and back', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    await user.type(search(), 'discard')
    expect(screen.getByRole('button', { name: '▦ Kartlar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))

    expect(screen.getByRole('button', { name: '☷ Liste' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('list', { name: 'Kartlar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Greedy Hands',
      'Let Go',
    ])
    expect(screen.getByRole('columnheader', { name: /Mechanic Pack/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '▦ Kartlar' }))
    expect(shownNames()).toEqual(['Greedy Hands', 'Let Go'])
  })

  it('gives every card face a magnifier, and no row of the list view', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    expect(
      screen
        .getAllByRole('button', { name: /: büyüt$/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(shownNames().map((name) => `${name}: büyüt`))

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))

    expect(screen.queryByRole('button', { name: /büyüt/ })).not.toBeInTheDocument()
  })

  it('shows a card added while the screen is open', () => {
    const { rerender } = render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)

    rerender(<CardBrowser deck="legend" cards={ready([...LEGEND, testCard('Fresh Import')])} />)

    expect(screen.getByRole('article', { name: 'Fresh Import' })).toBeInTheDocument()
    expect(screen.getByText('9 kart')).toBeInTheDocument()
  })
})

describe('CardBrowser for the Cursed deck', () => {
  const cursed: Subscription<Card[]> = ready(CURSED)

  it('lists the Cursed cards with their count, and offers no set or mechanic pack filter', () => {
    render(<CardBrowser deck="cursed" cards={cursed} />)

    expect(screen.getByText('2 kart')).toBeInTheDocument()
    expect(shownNames()).toEqual(['Heart Attack', 'Visions of Death'])
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('zooms a Cursed card to its picture, named Cursed with its cost', async () => {
    const user = userEvent.setup()
    const picture = testPicturePath('card', 'cursed-visionsofdeath')
    const url = testPictureUrl(picture)
    const withPicture = CURSED.map((card) =>
      card.id === 'cursed-visionsofdeath' ? { ...card, picture } : card,
    )
    render(
      <TestArtProvider>
        <CardBrowser deck="cursed" cards={ready(withPicture)} />
      </TestArtProvider>,
    )
    expect(screen.getAllByRole('button', { name: /: büyüt$/ })).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Visions of Death: büyüt' }))

    const zoom = screen.getByRole('dialog', { name: 'Visions of Death' })
    expect(zoom).toHaveTextContent('Cursed · Cost 1')
    expect(within(zoom).getByRole('img', { name: 'Visions of Death' })).toHaveAttribute('src', url)
  })

  it('searches and shows the Kart, Cost, Metin and Durum columns in the list view', async () => {
    const user = userEvent.setup()
    render(<CardBrowser deck="cursed" cards={cursed} />)

    await user.type(search(), 'hour')
    await user.click(screen.getByRole('button', { name: '☷ Liste' }))

    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Visions of Death',
    ])
    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.replace(/[▲▼↕]|\(.*\)/g, '').trim()),
    ).toEqual(['Kart', 'Cost', 'Metin', 'Durum'])
  })
})

/** A deck status: every card in the pool except those given, with the holders' names. */
function deckStatus(
  cards: readonly Card[],
  held: Record<string, Partial<CardStatus>>,
  counts = { poolCount: 0, handCount: 0 },
): DeckStatus {
  return {
    byCard: new Map(
      cards.map((card) => [
        card.id,
        {
          inPool: card.kind !== 'cursed',
          holderNames: [],
          ...held[card.name],
        },
      ]),
    ),
    ...counts,
  }
}

describe('CardBrowser pool status', () => {
  const greedy = 'Greedy Hands'
  const ayla = { inPool: false, holderNames: ['Ayla'] }
  const legendList = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
  }
  const durum = (name: string) =>
    within(screen.getByRole('row', { name: new RegExp(name) }))
      .getAllByRole('cell')
      .at(-1)

  it('shows a held card as "Elde" with its holder, and marks its face', async () => {
    const user = userEvent.setup()
    render(
      <CardBrowser
        deck="legend"
        cards={ready(LEGEND)}
        status={deckStatus(LEGEND, { [greedy]: ayla })}
      />,
    )

    expect(screen.getByRole('article', { name: greedy })).toHaveTextContent('Elde: Ayla')
    expect(screen.getByRole('article', { name: 'Let Go' })).not.toHaveTextContent('Elde')
    // A held card glows soft gold; a card in the pool does not glow.
    expect(screen.getByRole('article', { name: greedy }).closest('[data-glow]')).toHaveAttribute(
      'data-glow',
      'held',
    )
    expect(screen.getByRole('article', { name: 'Let Go' }).closest('[data-glow]')).toBeNull()

    await legendList(user)
    expect(durum(greedy)).toHaveTextContent('Elde: Ayla')
    expect(durum('Let Go')).toHaveTextContent('Havuzda')
  })

  it('shows a card back in the pool without a reload, with a higher pool count', () => {
    const { rerender } = render(
      <CardBrowser
        deck="legend"
        cards={ready(LEGEND)}
        status={deckStatus(LEGEND, { [greedy]: ayla }, { poolCount: 7, handCount: 1 })}
      />,
    )
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 7 · Ellerde 1')

    rerender(
      <CardBrowser
        deck="legend"
        cards={ready(LEGEND)}
        status={deckStatus(LEGEND, {}, { poolCount: 8, handCount: 0 })}
      />,
    )

    expect(screen.getByRole('article', { name: greedy })).not.toHaveTextContent('Elde')
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 8 · Ellerde 0')
  })

  it('shows a Blessed card in a hand as "Havuzda · Elde", without marking its face', async () => {
    const user = userEvent.setup()
    render(
      <CardBrowser
        deck="legend"
        cards={ready(LEGEND)}
        status={deckStatus(LEGEND, { 'Dawn of Fortune': { holderNames: ['Ayla'] } })}
      />,
    )

    expect(screen.getByRole('article', { name: 'Dawn of Fortune' })).not.toHaveTextContent('Elde')
    await legendList(user)
    expect(durum('Dawn of Fortune')).toHaveTextContent('Havuzda · Elde: Ayla')
  })

  it('lists only the pool with "Yalnızca havuzdakiler", combined with the search', async () => {
    const user = userEvent.setup()
    render(
      <CardBrowser
        deck="legend"
        cards={ready(LEGEND)}
        status={deckStatus(LEGEND, { [greedy]: ayla })}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Yalnızca havuzdakiler' }))

    expect(shownNames()).not.toContain(greedy)
    expect(shownNames()).toContain('Dawn of Fortune')
    expect(shownNames()).toContain('Halo of Kings')
    expect(screen.getByText('7 kart (toplam 8)')).toBeInTheDocument()

    await user.type(search(), 'discard')
    expect(shownNames()).toEqual(['Let Go'])
  })

  it('offers the pool-only filter only once the status is known, and not on the Cursed Deck', () => {
    const { rerender } = render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)
    expect(screen.getByRole('checkbox', { name: 'Yalnızca havuzdakiler' })).toBeDisabled()
    expect(screen.queryByLabelText('Havuz durumu')).not.toBeInTheDocument()

    rerender(<CardBrowser deck="cursed" cards={ready(CURSED)} status={deckStatus(CURSED, {})} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Havuz durumu')).not.toBeInTheDocument()
  })

  it('shows everyone who holds a Cursed card, on its face and in the Durum column', async () => {
    const user = userEvent.setup()
    render(
      <CardBrowser
        deck="cursed"
        cards={ready(CURSED)}
        status={deckStatus(CURSED, { 'Visions of Death': { holderNames: ['Ayla', 'Bora'] } })}
      />,
    )

    expect(screen.getByRole('article', { name: 'Visions of Death' })).toHaveTextContent(
      'Elde: Ayla, Bora',
    )
    expect(screen.getByRole('article', { name: 'Heart Attack' })).not.toHaveTextContent('Elde')

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    expect(durum('Visions of Death')).toHaveTextContent('Elde: Ayla, Bora')
    expect(durum('Heart Attack')).toHaveTextContent('—')
  })
})

describe('CardBrowser for the DM: the status filter and the edit control', () => {
  const draft = testCard('Lute Song', { status: 'draft', setCode: null, rarity: null })
  const retired = testCard('Old Aboleth', { status: 'retired', setCode: 'Kesqer' })
  const ALL_CARDS: Card[] = [...LEGEND, draft, retired]
  const byStatus = (value: string) =>
    value === 'all' ? ALL_CARDS : ALL_CARDS.filter((card) => card.status === value)

  /** The library as the DM's page renders it: the page filters the cards, the browser shows the filter. */
  function DmBrowser({ onEdit = () => undefined }: { onEdit?: (card: Card) => void }) {
    const [value, setValue] = useState<StatusFilterValue>('active')
    return (
      <CardBrowser
        deck="legend"
        cards={ready(byStatus(value))}
        status={deckStatus(ALL_CARDS, {
          'Old Aboleth': { inPool: false, holderNames: ['Ayla'] },
          'Lute Song': { inPool: false },
        })}
        statusFilter={{ value, onChange: setValue }}
        onEdit={onEdit}
      />
    )
  }

  it('starts at "Yayında" with the active cards, and lists the drafts or the retired cards on demand', async () => {
    const user = userEvent.setup()
    render(<DmBrowser />)

    expect(options('Durum')).toEqual(['Yayında', 'Taslak', 'Kaldırıldı', 'Hepsi'])
    expect(screen.getByRole('combobox', { name: 'Durum' })).toHaveValue('active')
    expect(shownNames()).not.toContain('Lute Song')
    expect(screen.getByRole('article', { name: 'Let Go' })).not.toHaveTextContent('Yayında')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'draft')
    expect(shownNames()).toEqual(['Lute Song'])
    expect(screen.getByRole('article', { name: 'Lute Song' })).toHaveTextContent('Taslak')
    expect(screen.getByText('1 kart')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'all')
    expect(shownNames()).toHaveLength(ALL_CARDS.length)
    expect(screen.getByRole('article', { name: 'Let Go' })).toHaveTextContent('Yayında')
  })

  it('combines the status filter with the search', async () => {
    const user = userEvent.setup()
    render(<DmBrowser />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'all')
    await user.type(search(), 'aboleth')
    expect(shownNames()).toEqual(['Old Aboleth'])
  })

  it('shows a retired card in a hand as "Kaldırıldı · Elde: Ayla"', async () => {
    const user = userEvent.setup()
    render(<DmBrowser />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'retired')
    expect(screen.getByRole('article', { name: 'Old Aboleth' })).toHaveTextContent('Kaldırıldı')

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    const row = within(screen.getByRole('row', { name: /Old Aboleth/ }))
    expect(row.getAllByRole('cell').at(-2)).toHaveTextContent('Kaldırıldı · Elde: Ayla')
  })

  it('keeps the toolbar when the filter keeps no card, so the DM can switch back', async () => {
    const user = userEvent.setup()
    function Empty() {
      const [value, setValue] = useState<StatusFilterValue>('draft')
      return (
        <CardBrowser
          deck="cursed"
          cards={ready(value === 'draft' ? [] : CURSED)}
          statusFilter={{ value, onChange: setValue }}
        />
      )
    }
    render(<Empty />)
    expect(screen.getByText('Kart bulunamadı.')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'active')
    expect(shownNames()).toHaveLength(2)
  })

  it('opens the edit form from a face and from a list row', async () => {
    const user = userEvent.setup()
    const edited: string[] = []
    render(<DmBrowser onEdit={(card) => edited.push(card.name)} />)

    await user.click(screen.getByRole('button', { name: 'Let Go: düzenle' }))
    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    await user.click(screen.getByRole('button', { name: 'Greedy Hands: düzenle' }))
    expect(edited).toEqual(['Let Go', 'Greedy Hands'])
  })

  it('shows a player no status filter and no edit control', () => {
    render(<CardBrowser deck="legend" cards={ready(LEGEND)} />)
    expect(screen.queryByRole('combobox', { name: 'Durum' })).toBeNull()
    expect(screen.queryByRole('button', { name: /düzenle/ })).toBeNull()
  })
})

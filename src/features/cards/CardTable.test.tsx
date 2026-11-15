import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { renderWithSets } from '@/test/renderWithSets'
import { testTrueWord } from '@/test/trueWordFixtures'

import { CardTable } from './CardTable'
import type { Definition } from './schema'
import { type CardSort, DEFAULT_SORT, type SortKey, sortCards, type StatusText } from './sort'
import { LEGEND_COLUMNS, PLAIN_COLUMNS } from './tableColumns'

/** The table with the same sort handling as the card browser. */
function SortableTable({
  deck,
  cards,
  statusText,
}: {
  deck: 'legend' | 'plain'
  cards: Definition[]
  statusText?: StatusText
}) {
  const [sort, setSort] = useState<CardSort>(DEFAULT_SORT)
  const onSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  return (
    <CardTable
      columns={deck === 'legend' ? LEGEND_COLUMNS : PLAIN_COLUMNS}
      cards={sortCards(cards, sort, statusText)}
      sort={sort}
      onSort={onSort}
      statusText={statusText}
    />
  )
}

const headers = () =>
  screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.replace(/[▲▼↕]|\(.*\)/g, '').trim())

const rowNames = () => screen.getAllByRole('rowheader').map((cell) => cell.textContent)

describe('CardTable', () => {
  it('marks a hidden card\'s row "🔒 DM" for the DM only', () => {
    const wish = testCard('The Last Wish', { isInLibrary: false })
    const eyes = testCard("Aboleth's Eyes")
    const props = { columns: LEGEND_COLUMNS, sort: DEFAULT_SORT, onSort: () => {} }
    const view = renderWithSets(<CardTable {...props} cards={[eyes, wish]} marksHidden />)
    expect(screen.getByRole('rowheader', { name: /The Last Wish/ })).toHaveTextContent('🔒 DM')
    expect(screen.getByRole('rowheader', { name: /Aboleth's Eyes/ })).not.toHaveTextContent('🔒')
    view.rerender(<CardTable {...props} cards={[eyes, wish]} />)
    expect(screen.getByRole('rowheader', { name: /The Last Wish/ })).not.toHaveTextContent('🔒')
  })

  it('has the Legend columns Kart, Set, Cost, Rarity, Mechanic Pack, Metin and Durum', () => {
    renderWithSets(<SortableTable deck="legend" cards={[testCard('A')]} />)
    expect(headers()).toEqual(['Kart', 'Set', 'Cost', 'Rarity', 'Mechanic Pack', 'Metin', 'Durum'])
  })

  it('has the Cursed columns Kart, Cost, Metin and Durum', () => {
    renderWithSets(<SortableTable deck="plain" cards={[testCursedCard('Hex')]} />)
    expect(headers()).toEqual(['Kart', 'Cost', 'Metin', 'Durum'])
  })

  it("lists True Words with their name, cost, visible text and Durum, and marks the chosen player's", () => {
    const abyss = testTrueWord('Abyss', { cost: 'X', text: '[Deep] Pull them under.' })
    const aid = testTrueWord('Aid')
    renderWithSets(
      <CardTable
        columns={PLAIN_COLUMNS}
        cards={[abyss, aid]}
        sort={DEFAULT_SORT}
        onSort={() => {}}
        statusText={(word) => (word.id === abyss.id ? 'Bilenler: Ayla' : null)}
        isKnown={(word) => word.id === abyss.id}
      />,
    )

    expect(headers()).toEqual(['Kart', 'Cost', 'Metin', 'Durum'])
    const row = screen.getByRole('row', { name: /Abyss/ })
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['X', 'Pull them under.', 'Bilenler: Ayla'])
    expect(screen.getByRole('rowheader', { name: /Abyss/ })).toHaveTextContent('Biliyor')
    expect(screen.getByRole('rowheader', { name: /Aid/ })).not.toHaveTextContent('Biliyor')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the official set name, "Blessed", "—" for missing values, and the visible text', () => {
    renderWithSets(
      <SortableTable
        deck="legend"
        cards={[
          testCard('Night Owl', { setCode: 'Kesqer', text: '[meta] Hoot.' }),
          testBlessedCard('Halo', { mechanicPack: 'Permamancy' }),
        ]}
      />,
    )
    const owl = within(screen.getByRole('row', { name: /Night Owl/ }))
    expect(owl.getByText('Kesqerian Nights')).toBeInTheDocument()
    expect(owl.getByText('Hoot.')).toBeInTheDocument()
    const halo = within(screen.getByRole('row', { name: /Halo/ }))
    expect(halo.getByText('Blessed')).toBeInTheDocument()
    expect(halo.getAllByText('—')).toHaveLength(3) // cost, rarity, and a status not known yet
  })

  it('starts sorted by name', () => {
    renderWithSets(
      <SortableTable
        deck="legend"
        cards={[testCard('Çelik'), testCard('Zor'), testCard('Ağır')]}
      />,
    )
    expect(rowNames()).toEqual(['Ağır', 'Çelik', 'Zor'])
    expect(screen.getByRole('columnheader', { name: /Kart/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('sorts by Cost, then reverses the order when the heading is selected again', async () => {
    const user = userEvent.setup()
    renderWithSets(
      <SortableTable
        deck="legend"
        cards={[
          testCard('Three', { cost: '3' }),
          testCard('None', { cost: null }),
          testCard('Zero', { cost: '0' }),
          testCard('Ten', { cost: '10' }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Cost/ }))
    expect(rowNames()).toEqual(['Zero', 'Three', 'Ten', 'None'])
    expect(screen.getByRole('columnheader', { name: /Cost/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('button', { name: /^Cost/ })).toHaveAccessibleName(/^Cost\s*\(artan\)$/)

    await user.click(screen.getByRole('button', { name: /^Cost/ }))
    expect(rowNames()).toEqual(['Ten', 'Three', 'Zero', 'None'])
    expect(screen.getByRole('columnheader', { name: /Cost/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('columnheader', { name: /Kart/ })).toHaveAttribute('aria-sort', 'none')
  })

  it("shows each card's status in the Durum column and sorts by it", async () => {
    const user = userEvent.setup()
    const statuses: Record<string, string> = {
      Zor: 'Havuzda',
      Ağır: 'Elde: Bora',
      Çelik: 'Elde: Ayla',
    }
    renderWithSets(
      <SortableTable
        deck="legend"
        cards={[testCard('Zor'), testCard('Ağır'), testCard('Çelik')]}
        statusText={(card) => statuses[card.name] ?? null}
      />,
    )
    expect(within(screen.getByRole('row', { name: /Ağır/ })).getByText('Elde: Bora')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Durum/ }))

    expect(rowNames()).toEqual(['Çelik', 'Ağır', 'Zor'])
    expect(screen.getByRole('columnheader', { name: /Durum/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it("keeps a sorted column's hidden direction inside the scrolling area, so the page never scrolls sideways", async () => {
    const user = userEvent.setup()
    renderWithSets(<SortableTable deck="legend" cards={[testCard('Zor'), testCard('Ağır')]} />)

    await user.click(screen.getByRole('button', { name: /^Durum/ }))

    const direction = within(screen.getByRole('columnheader', { name: /Durum/ })).getByText(
      '(artan)',
    )
    expect(direction).toHaveClass('sr-only')
    expect(screen.getByRole('table').parentElement).toHaveClass('relative', 'overflow-x-auto')
  })
})

describe('CardTable history links', () => {
  const renderTable = (linksHistory: boolean) =>
    renderWithSets(
      <MemoryRouter>
        <CardTable
          columns={LEGEND_COLUMNS}
          cards={[testCard("Aboleth's Eyes"), testCursedCard('Hex')]}
          sort={DEFAULT_SORT}
          onSort={() => {}}
          linksHistory={linksHistory}
        />
      </MemoryRouter>,
    )

  it("links each name to the card's history, below the Kütüphane", () => {
    renderTable(true)

    expect(screen.getByRole('link', { name: "Aboleth's Eyes" })).toHaveAttribute(
      'href',
      '/library/legend-abolethseyes',
    )
    expect(screen.getByRole('link', { name: 'Hex' })).toHaveAttribute('href', '/library/cursed-hex')
  })

  it('leaves the names as text without it', () => {
    renderTable(false)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: "Aboleth's Eyes" })).toBeInTheDocument()
  })
})

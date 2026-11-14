import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { renderWithSets } from '@/test/renderWithSets'

import type { Deck } from './cardsContext'
import { CardTable } from './CardTable'
import type { Card } from './schema'
import { type CardSort, DEFAULT_SORT, type SortKey, sortCards, type StatusText } from './sort'

/** The table with the same sort handling as the card browser. */
function SortableTable({
  deck,
  cards,
  statusText,
}: {
  deck: Deck
  cards: Card[]
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
      deck={deck}
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
  it('marks a DM-only row "🔒 DM" for the DM only', () => {
    const wish = testCard('The Last Wish', { dmOnly: true })
    const eyes = testCard("Aboleth's Eyes")
    const props = { deck: 'legend' as const, sort: DEFAULT_SORT, onSort: () => {} }
    const view = renderWithSets(<CardTable {...props} cards={[eyes, wish]} marksDmOnly />)
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
    renderWithSets(<SortableTable deck="cursed" cards={[testCursedCard('Hex')]} />)
    expect(headers()).toEqual(['Kart', 'Cost', 'Metin', 'Durum'])
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
})

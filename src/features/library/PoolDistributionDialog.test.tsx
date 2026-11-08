import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

const many = (count: number, make: (index: number) => Card) =>
  Array.from({ length: count }, (_, index) => make(index))

/** 300 Common, 100 Rare (60 of them from Kesqer) and 20 Blessed cards in the pool, plus cards that are not. */
const POOL = [
  ...many(300, (i) => testCard(`Common ${i}`, { setCode: 'Pentagon' })),
  ...many(100, (i) =>
    testCard(`Rare ${i}`, { rarity: 'rare', setCode: i < 60 ? 'Kesqer' : 'Ashavir' }),
  ),
  ...many(20, (i) => testBlessedCard(`Blessed ${i}`)),
  testCard('Held', { holder: { uid: 'ayla', userCardId: 'h1' } }),
  testCard('Retired', { retired: true }),
  testCursedCard('Visions of Death'),
]

async function openDistribution(cards: Card[]) {
  const app = renderApp({ path: '/library', cards: { cards: ready(cards) } })
  await userEvent.click(screen.getByRole('button', { name: '▥ Havuz Dağılımı' }))
  return { ...app, dialog: () => within(screen.getByRole('dialog', { name: '▥ Havuz Dağılımı' })) }
}

describe('the pool distribution', () => {
  it('shows the drawable cards and each rarity in Turkish number format', async () => {
    const { dialog } = await openDistribution(POOL)

    expect(dialog().getByText(/Havuzda çekilebilecek/)).toHaveTextContent(
      'Havuzda çekilebilecek 420 kart var.',
    )
    const rarities = within(dialog().getByRole('region', { name: 'Nadirlik' }))
    expect(rarities.getByText('Common').closest('li')).toHaveTextContent('%71,4 (300)')
    expect(rarities.getByText('Rare').closest('li')).toHaveTextContent('%23,8 (100)')
    expect(rarities.getAllByText('Blessed')[0]?.closest('li')).toHaveTextContent('%4,8 (20)')
  })

  it('lists the sets inside each rarity, and each set with its share', async () => {
    const { dialog } = await openDistribution(POOL)

    const rareSets = within(dialog().getByRole('list', { name: 'Rare setleri' }))
    expect(rareSets.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Kesqerian Nights60',
      'The Overlord of Ashavir40',
    ])
    const sets = within(dialog().getByRole('region', { name: 'Setler' }))
    expect(sets.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Conclave at Pentagon%71,4 (300)',
      'Kesqerian Nights%14,3 (60)',
      'The Overlord of Ashavir%9,5 (40)',
      'Blessed%4,8 (20)',
    ])
  })

  it('updates live when a card is drawn', async () => {
    const { dialog, setCards } = await openDistribution(POOL)

    const [first, ...rest] = POOL
    if (!first || first.kind !== 'normal') throw new Error('Expected a normal card')
    setCards({ cards: ready([{ ...first, holder: { uid: 'ayla', userCardId: 'h2' } }, ...rest]) })

    expect(dialog().getByText(/Havuzda çekilebilecek/)).toHaveTextContent(
      'Havuzda çekilebilecek 419 kart var.',
    )
    expect(dialog().getByText('Common').closest('li')).toHaveTextContent('%71,4 (299)')
  })

  it('says so when the pool is empty', async () => {
    const { dialog } = await openDistribution([
      testCard('Held', { holder: { uid: 'ayla', userCardId: 'h1' } }),
      testCursedCard('Visions of Death'),
    ])

    expect(dialog().getByText('Havuzda gösterilecek kart yok.')).toBeInTheDocument()
    expect(dialog().queryByRole('region', { name: 'Nadirlik' })).not.toBeInTheDocument()
  })

  it('closes with "Kapat"', async () => {
    await openDistribution(POOL)

    await userEvent.click(screen.getByRole('button', { name: '✕ Kapat' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

import { cardStatuses } from './cardStatus'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const profiles = [testProfile(), ayla, bora]

const pool = testCard('Pool Card')
const eyes = testCard("Aboleth's Eyes", { holder: { uid: 'ayla', userCardId: 'ayla-eyes' } })
const halo = testBlessedCard('Second Wind')
const visions = testCursedCard('Visions of Death')
const hex = testCursedCard('Hex')

describe('cardStatuses', () => {
  it('reads the pool from the holder, and the names from the open holdings and the profiles', () => {
    const copy = testCard('Copied', { holder: null })
    const statuses = cardStatuses(
      [pool, eyes, copy, halo, visions, hex],
      [
        testHolding(eyes, 'ayla', 1000, { id: 'ayla-eyes' }),
        testHolding(eyes, 'bora', 2000, { id: 'bora-eyes-copy' }),
        testHolding(copy, 'bora', 1000),
        testHolding(halo, 'ayla', 1000),
        testHolding(visions, 'bora', 1000),
        testHolding(visions, 'ayla', 2000),
        testHolding(visions, 'ayla', 3000, { id: 'second' }),
      ],
      profiles,
    )

    expect(statuses.get(pool.id)).toEqual({ inPool: true, holderNames: [] })
    expect(statuses.get(eyes.id)).toEqual({ inPool: false, holderNames: ['Ayla', 'Bora'] })
    // A DM's extra copy that outlived the original: the card is back in the pool, the copy is still named.
    expect(statuses.get(copy.id)).toEqual({ inPool: true, holderNames: ['Bora'] })
    expect(statuses.get(halo.id)).toEqual({ inPool: true, holderNames: ['Ayla'] })
    expect(statuses.get(visions.id)).toEqual({ inPool: false, holderNames: ['Bora', 'Ayla'] })
    expect(statuses.get(hex.id)).toEqual({ inPool: false, holderNames: [] })
  })

  it('names the holder before its holding arrives, and a user without a profile generically', () => {
    const statuses = cardStatuses([eyes, visions], [testHolding(visions, 'ghost', 1000)], profiles)

    expect(statuses.get(eyes.id)).toEqual({ inPool: false, holderNames: ['Ayla'] })
    expect(statuses.get(visions.id)?.holderNames).toEqual(['İsimsiz oyuncu'])
  })
})

describe('pool status on the card screens', () => {
  it('shows the library status and counts live as a card returns to the pool', async () => {
    const user = userEvent.setup()
    const { setCards, setHoldings } = renderApp({
      path: '/library',
      users: { profiles: ready(profiles) },
      cards: { cards: ready([pool, eyes, halo, visions]) },
      holdings: {
        openHoldings: ready([
          testHolding(eyes, 'ayla', 1000, { id: 'ayla-eyes' }),
          testHolding(halo, 'ayla', 2000),
          testHolding(visions, 'bora', 3000),
        ]),
      },
    })

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toHaveTextContent('Elde: Ayla')
    // In the pool: the pool card and the Blessed card. In hands: the copies of Legend cards.
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 2 · Ellerde 2')

    // Ayla uses the card on another device.
    setCards({ cards: ready([pool, { ...eyes, holder: null }, halo, visions]) })
    setHoldings({
      openHoldings: ready([testHolding(halo, 'ayla', 2000), testHolding(visions, 'bora', 3000)]),
    })

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).not.toHaveTextContent('Elde')
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 3 · Ellerde 1')
    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    expect(screen.getByRole('row', { name: /Aboleth's Eyes/ })).toHaveTextContent('Havuzda')
    expect(screen.getByRole('row', { name: /Second Wind/ })).toHaveTextContent(
      'Havuzda · Elde: Ayla',
    )
  })

  it('shows on the Cursed Deck everyone who holds a Cursed card', () => {
    renderApp({
      path: '/cursed-deck',
      users: { profiles: ready(profiles) },
      cards: { cards: ready([visions, hex]) },
      holdings: {
        openHoldings: ready([
          testHolding(visions, 'ayla', 1000),
          testHolding(visions, 'bora', 2000),
        ]),
      },
    })

    expect(
      within(screen.getByRole('article', { name: 'Visions of Death' })).getByText(
        'Elde: Ayla, Bora',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Hex' })).not.toHaveTextContent('Elde')
  })
})

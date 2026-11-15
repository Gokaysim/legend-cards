import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

const curse = testCursedCard('Abandon All Hope')

function renderCursedDeck() {
  const player = testProfile()
  return renderApp({
    path: '/cursed-deck',
    users: { currentProfile: ready(player), profiles: ready([player]) },
    cards: { cards: ready([curse]) },
  })
}

describe('the Cursed Deck', () => {
  it("opens a Cursed card's history from the clock control on its face", async () => {
    const user = userEvent.setup()
    const { router } = renderCursedDeck()

    const face = screen.getByRole('article', { name: 'Abandon All Hope' })
    await user.click(within(face).getByRole('link', { name: 'Abandon All Hope: geçmiş' }))

    expect(router.state.location.pathname).toBe(`/cursed-deck/${curse.id}`)
    expect(screen.getByRole('heading', { level: 1, name: 'Abandon All Hope' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Cursed Deck' })).toBeInTheDocument()
  })

  it("opens a Cursed card's history from its name in the list view", async () => {
    const user = userEvent.setup()
    const { router } = renderCursedDeck()

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    await user.click(screen.getByRole('link', { name: 'Abandon All Hope' }))

    expect(router.state.location.pathname).toBe(`/cursed-deck/${curse.id}`)
  })
})

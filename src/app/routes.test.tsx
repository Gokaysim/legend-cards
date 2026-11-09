import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

import { SCREENS } from './screens'

const EXPECTED_LABELS = [
  'Oyuncu elleri',
  'Shops',
  'True Words',
  'Custom Card Draft',
  'Kart kütüphanesi',
  'Cursed Deck',
  'İşlem Logu',
  'Kurallar',
  'Veri / Yedek',
]

const mainMenu = () => screen.getByRole('navigation', { name: 'Ana menü' })

/** One card of each kind, so each card screen can show that it lists only its own deck. */
const CARDS = ready([
  testCard("Aboleth's Eyes"),
  testBlessedCard('Dawn of Fortune'),
  testCursedCard('Visions of Death'),
])

/** Menu entries that land somewhere else than their own path, with the heading shown there. */
const LANDINGS: Record<string, { pathname: string; heading: string }> = {
  // "Oyuncu elleri" opens the signed-in player's own hand.
  '/hands': { pathname: `/hands/${testUser.uid}`, heading: 'Gökay — Kart Eli' },
}

/** The screens that have real content, with what each one shows instead of the not-ready note. */
const BUILT_SCREENS: Record<string, () => void> = {
  // The hand of the signed-in player, who holds no cards here.
  '/hands': () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Gökay — Kart Eli' })).toBeInTheDocument()
    expect(screen.getByText('Bu elde henüz kart yok.')).toBeInTheDocument()
  },
  // The Shops hub leads to the two shops.
  '/shops': () => {
    expect(screen.getByRole('link', { name: 'Pack Shop' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Elixir Shop' })).toBeInTheDocument()
  },
  // The card screens list their own deck only.
  '/library': () => {
    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Dawn of Fortune' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Visions of Death' })).not.toBeInTheDocument()
  },
  '/cursed-deck': () => {
    expect(screen.getByRole('article', { name: 'Visions of Death' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: "Aboleth's Eyes" })).not.toBeInTheDocument()
  },
  // True Words, before any word was imported: the draft section and the empty list.
  '/true-words': () => {
    expect(screen.getByRole('region', { name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByText('Henüz True Word yok.')).toBeInTheDocument()
  },
  // The log, before anything happened.
  '/log': () => {
    expect(screen.getByText('Henüz kayıtlı işlem yok.')).toBeInTheDocument()
  },
}

describe('routes and navigation', () => {
  it('lists the main screens in the legacy v2.2.8 order', () => {
    renderApp({ path: '/hands' })

    const labels = within(mainMenu())
      .getAllByRole('link')
      .map((link) => link.textContent?.trim())
    expect(labels).toEqual(EXPECTED_LABELS.map((label, i) => `${SCREENS[i]?.icon}${label}`))
  })

  it('opens the "Oyuncu elleri" screen on the own hand from the root URL', async () => {
    const { router } = renderApp({ path: '/' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gökay — Kart Eli' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
    expect(within(mainMenu()).getByRole('link', { name: 'Oyuncu elleri' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it("shows a player's hand directly from its URL and keeps the menu entry marked", () => {
    renderApp({
      path: '/hands/bora',
      users: { profiles: ready([testProfile(), testProfile({ id: 'bora', displayName: 'Bora' })]) },
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Bora — Kart Eli' })).toBeInTheDocument()
    expect(screen.queryByText('Bu ekran henüz hazır değil.')).not.toBeInTheDocument()
    expect(within(mainMenu()).getByRole('link', { name: 'Oyuncu elleri' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it.each(SCREENS.map((s) => [s.label, s.path] as const))(
    'navigates to %s and marks it as current',
    async (label, path) => {
      const user = userEvent.setup()
      const { router } = renderApp({
        path: path === '/hands' ? '/rules' : '/hands',
        cards: { cards: CARDS },
      })

      await user.click(within(mainMenu()).getByRole('link', { name: label }))

      const landing = LANDINGS[path] ?? { pathname: path, heading: label }
      expect(router.state.location.pathname).toBe(landing.pathname)
      expect(screen.getByRole('heading', { level: 1, name: landing.heading })).toBeInTheDocument()
      const showsContent = BUILT_SCREENS[path]
      if (showsContent) {
        showsContent()
        expect(screen.queryByText('Bu ekran henüz hazır değil.')).not.toBeInTheDocument()
      } else {
        expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
      }
      expect(within(mainMenu()).getByRole('link', { name: label })).toHaveAttribute(
        'aria-current',
        'page',
      )
      const others = within(mainMenu())
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
      expect(others).toHaveLength(1)
    },
  )

  it('shows each screen directly from its URL, as after a reload', () => {
    renderApp({ path: '/true-words' })

    expect(screen.getByRole('heading', { level: 1, name: 'True Words' })).toBeInTheDocument()
  })

  it('shows a not-found page with a link back to the default screen', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/does-not-exist' })

    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Oyuncu elleri ekranına dön' }))

    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
  })
})

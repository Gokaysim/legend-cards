import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { stubPhoneWidth, stubWideHover } from '@/test/media'
import { renderApp } from '@/test/renderApp'

import { SCREENS, SHOP_SCREENS } from './screens'

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
  '/hands': { pathname: `/hands/${testUser.uid}`, heading: 'Oyuncu elleri' },
}

/** The screens that have real content, with what each one shows instead of the not-ready note. */
const BUILT_SCREENS: Record<string, () => void> = {
  // The hand of the signed-in player, who holds no cards here.
  '/hands': () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Oyuncu elleri' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Gökay — Kart Eli' })).toBeInTheDocument()
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
  // The rules, starting with the Legend Point section.
  '/rules': () => {
    expect(screen.getByRole('region', { name: 'Legend Point Kart Sistemi' })).toBeInTheDocument()
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
      await screen.findByRole('heading', { level: 2, name: 'Gökay — Kart Eli' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Oyuncu elleri' })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { level: 2, name: 'Bora — Kart Eli' })).toBeInTheDocument()
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

describe("each screen's Cardmaker", () => {
  /** Every Cardmaker the archives have; `cardmaker_keep` (Shops) and `cardmaker_custom` are not among them. */
  const ART = testArt({
    mascots: Object.fromEntries(
      [
        'cardmaker_shop',
        'cardmaker_lib',
        'cardmaker_cursed',
        'cardmaker_true',
        'cardmaker_think',
        'cardmaker_zaddir',
        'cardmaker_wave',
        'cardmaker_peek',
      ].map((stem) => [stem, `/art/mascots/${stem}.0123456789.webp`]),
    ),
  })
  /** The decorative Cardmaker picture in the screen's title row, if any. */
  const headerMascot = () =>
    screen.getByRole('heading', { level: 1 }).closest('header')?.querySelector('img[data-mascot]')

  it.each([
    // The Shops screen's own `cardmaker_keep` has no picture: the Pack Shop's stands in for it.
    ['/shops', 'cardmaker_shop'],
    ['/shops/packs', 'cardmaker_shop'],
    ['/library', 'cardmaker_lib'],
    ['/cursed-deck', 'cardmaker_cursed'],
    ['/true-words', 'cardmaker_true'],
    ['/log', 'cardmaker_think'],
    ['/shops/elixirs', 'cardmaker_zaddir'],
    ['/rules', 'cardmaker_wave'],
    ['/settings', 'cardmaker_peek'],
  ])('shows %s with its Cardmaker, as decoration', (path, stem) => {
    renderApp({ path, cards: { cards: CARDS }, art: ART })

    const mascot = headerMascot()
    expect(mascot).toHaveAttribute('src', `/art/mascots/${stem}.0123456789.webp`)
    expect(mascot).toHaveAttribute('alt', '')
  })

  it('names the Cardmaker of every screen in the screen lists', () => {
    expect(Object.fromEntries(SCREENS.map((s) => [s.id, s.mascot]))).toEqual({
      hands: null,
      shops: 'cardmaker_keep',
      'true-words': 'cardmaker_true',
      'custom-draft': 'cardmaker_custom',
      library: 'cardmaker_lib',
      'cursed-deck': 'cardmaker_cursed',
      'activity-log': 'cardmaker_think',
      rules: 'cardmaker_wave',
      settings: 'cardmaker_peek',
    })
    expect(SHOP_SCREENS.map((s) => s.mascot)).toEqual(['cardmaker_shop', 'cardmaker_zaddir'])
  })

  it.each([
    ['the Custom Card Draft, whose Cardmaker has no picture', '/custom-draft', 'Custom Card Draft'],
    ['a hand, which has no Cardmaker', `/hands/${testUser.uid}`, 'Oyuncu elleri'],
  ])('shows %s without a picture', (_case, path, title) => {
    renderApp({ path, art: ART })

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(headerMascot()).toBeNull()
  })

  it('shows no Cardmaker anywhere without pictures', () => {
    renderApp({ path: '/library', cards: { cards: CARDS } })

    expect(document.querySelector('img[data-mascot]')).toBeNull()
  })

  describe('in the corner or nowhere', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const cornerStem = () =>
      document.querySelector('[data-corner-cardmaker]')?.getAttribute('data-corner-cardmaker')

    it.each([
      ['/shops', 'cardmaker_shop'],
      ['/library', 'cardmaker_lib'],
      ['/cursed-deck', 'cardmaker_cursed'],
      ['/rules', 'cardmaker_wave'],
      ['/settings', 'cardmaker_peek'],
      ['/shops/elixirs', 'cardmaker_zaddir'],
    ])('stands the Cardmaker of %s in the corner on a wide window with a mouse', (path, stem) => {
      stubWideHover()
      renderApp({ path, cards: { cards: CARDS }, art: ART })

      expect(cornerStem()).toBe(stem)
      expect(headerMascot()).toBeNull()
    })

    it.each([
      ['/true-words', 'cardmaker_true'],
      ['/log', 'cardmaker_think'],
    ])('keeps the Cardmaker of %s by the title on a wide window with a mouse', (path, stem) => {
      stubWideHover()
      renderApp({ path, cards: { cards: CARDS }, art: ART })

      expect(headerMascot()).toHaveAttribute('src', `/art/mascots/${stem}.0123456789.webp`)
      expect(cornerStem()).toBeUndefined()
    })

    it.each(['/shops', '/library', '/rules', '/true-words', '/settings'])(
      'shows no Cardmaker on %s on a phone',
      (path) => {
        stubPhoneWidth()
        renderApp({ path, cards: { cards: CARDS }, art: ART })

        expect(document.querySelector('img[data-mascot]')).toBeNull()
      },
    )
  })
})

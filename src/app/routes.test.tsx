import { act, fireEvent, screen, within } from '@testing-library/react'
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
  'Custom Card Draft',
  'Kütüphane',
  'Setler',
  'Zarlar',
  'İşlem Logu',
  'Kurallar',
  'Ayarlar',
]

const mainMenu = () => screen.getByRole('navigation', { name: 'Ana menü' })

/** One card of each kind, so each tab of the Kütüphane can show that it lists only its own deck. */
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
  // The Kütüphane opens on its Kartlar tab, which lists the Legend deck only.
  '/library': () => {
    expect(screen.getByRole('tab', { name: /^♠ Kartlar/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Dawn of Fortune' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Visions of Death' })).not.toBeInTheDocument()
  },
  // The sets, in the stored order.
  '/sets': () => {
    expect(screen.getByRole('rowheader', { name: /^The End is Nigh/ })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /^Pandemonium/ })).toBeInTheDocument()
  },
  // The Zarlar screen: the strip with "Zar stili", the roll form, and the Kanal and İnisiyatif tabs.
  '/dice': () => {
    expect(screen.getByTestId('dice-strip')).toHaveTextContent('Henüz zar atılmadı.')
    expect(screen.getByRole('button', { name: 'Zar stili' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Atışlar' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Zar at' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kanal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'İnisiyatif' })).toBeInTheDocument()
  },
  // The log, before anything happened.
  '/log': () => {
    expect(screen.getByText('Henüz kayıtlı işlem yok.')).toBeInTheDocument()
  },
  // The rules, starting with the Legend Point section.
  '/rules': () => {
    expect(screen.getByRole('region', { name: 'Legend Point Kart Sistemi' })).toBeInTheDocument()
  },
  // The Ayarlar screen: the table settings, and the data section still to come.
  '/settings': () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Ayarlar' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Oyuncu kart çekişi' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Veri / Yedek' })).toBeInTheDocument()
  },
}

describe('routes and navigation', () => {
  it('lists the main screens, with the Kütüphane in place of the three card screens', () => {
    renderApp({ path: '/hands' })

    const labels = within(mainMenu())
      .getAllByRole('link')
      .map((link) => link.textContent?.trim())
    expect(labels).toEqual(EXPECTED_LABELS.map((label, i) => `${SCREENS[i]?.icon}${label}`))
  })

  it('puts Zarlar between Setler and İşlem Logu, under its own URL', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/hands' })
    const labels = within(mainMenu())
      .getAllByRole('link')
      // The icon is the first character, hidden from the link's name.
      .map((link) =>
        Array.from(link.textContent ?? '')
          .slice(1)
          .join(''),
      )
    expect(labels.slice(labels.indexOf('Setler'), labels.indexOf('İşlem Logu') + 1)).toEqual([
      'Setler',
      'Zarlar',
      'İşlem Logu',
    ])

    await user.click(within(mainMenu()).getByRole('link', { name: 'Zarlar' }))
    expect(router.state.location.pathname).toBe('/dice')
    expect(within(mainMenu()).getByRole('link', { name: 'Zarlar' })).toHaveAttribute(
      'aria-current',
      'page',
    )
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

  it.each([
    ["a Legend card's history", '/library/legend-abolethseyes', "Aboleth's Eyes", 'Kütüphane'],
    ["a Blessed card's history", '/library/legend-dawnoffortune', 'Dawn of Fortune', 'Kütüphane'],
    ["a Cursed card's history", '/library/cursed-visionsofdeath', 'Visions of Death', 'Kütüphane'],
    ["a set's statistics", '/sets/kesqer', 'Kesqerian Nights', 'Setler'],
  ])(
    'shows %s from its URL, as after a reload, keeping its menu entry marked',
    (_, path, heading, menu) => {
      const { router } = renderApp({ path, cards: { cards: CARDS } })

      expect(router.state.location.pathname).toBe(path)
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `← ${menu}` })).toBeInTheDocument()
      const marked = within(mainMenu())
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
      expect(marked.map((link) => link.textContent)).toEqual([expect.stringContaining(menu)])
    },
  )

  it('leads back from a detail page to its menu screen', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/sets/kesqer', cards: { cards: CARDS } })

    await user.click(screen.getByRole('link', { name: '← Setler' }))

    expect(router.state.location.pathname).toBe('/sets')
  })

  it('shows a tab of the Kütüphane directly from its URL, as after a reload', () => {
    renderApp({ path: '/library?tab=true-words' })

    expect(screen.getByRole('heading', { level: 1, name: 'Kütüphane' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^✦ True Words/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('region', { name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByText('Henüz True Word yok.')).toBeInTheDocument()
  })

  it('opens the Kütüphane on its tabs from the former Cursed Deck and True Words addresses', () => {
    const marked = () =>
      within(mainMenu())
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
        .map((link) => link.textContent)

    const cursed = renderApp({ path: '/cursed-deck', cards: { cards: CARDS } })
    expect(cursed.router.state.location).toMatchObject({
      pathname: '/library',
      search: '?tab=cursed',
    })
    expect(screen.getByRole('tab', { name: /^☠ Cursed/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('article', { name: 'Visions of Death' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: "Aboleth's Eyes" })).not.toBeInTheDocument()
    expect(marked()).toEqual([expect.stringContaining('Kütüphane')])
    cursed.unmount()

    const words = renderApp({
      path: '/true-words?for=bora',
      users: {
        currentProfile: ready(testProfile({ role: 'dm', displayName: 'Dana' })),
        profiles: ready([
          testProfile({ role: 'dm', displayName: 'Dana' }),
          testProfile({ id: 'ayla', displayName: 'Ayla' }),
          testProfile({ id: 'bora', displayName: 'Bora' }),
        ]),
      },
    })
    expect(words.router.state.location).toMatchObject({
      pathname: '/library',
      search: '?tab=true-words&for=bora',
    })
    expect(screen.getByLabelText('Kimin için')).toHaveValue('bora')
  })

  it('replaces a former address in the history, so going back leaves it', async () => {
    const { router } = renderApp({ path: '/sets', cards: { cards: CARDS } })

    await act(() => router.navigate('/cursed-deck'))
    expect(router.state.location.pathname).toBe('/library')
    await act(() => router.navigate(-1))

    expect(router.state.location.pathname).toBe('/sets')
  })

  it('shows only the manticore, centered, with "Sayfa bulunamadı" under it, and the menu to leave', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/does-not-exist' })

    const page = screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' }).parentElement
    if (!page) throw new Error('No page')
    expect(page).toHaveClass('items-center', 'justify-center')
    expect(within(page).getAllByRole('img')).toHaveLength(1)
    expect(within(page).queryByRole('link')).not.toBeInTheDocument()
    expect(page).toHaveTextContent(/^Sayfa bulunamadı$/)

    await user.click(screen.getAllByRole('link', { name: /Oyuncu elleri/ })[0] as HTMLElement)
    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
  })

  describe('on a phone', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows the manticore above the message, also on a phone', () => {
      stubPhoneWidth()
      renderApp({ path: '/does-not-exist' })

      const picture = screen.getByRole('img', { name: 'Mahcup ama tehlikeli bir mantikor' })
      const heading = screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })
      expect(
        picture.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(picture).toHaveAttribute('width', '1200')
      expect(picture).toHaveAttribute('height', '922')
    })
  })

  it('keeps the line when the picture fails', () => {
    renderApp({ path: '/does-not-exist' })

    fireEvent.error(screen.getByRole('img', { name: 'Mahcup ama tehlikeli bir mantikor' }))

    expect(screen.queryByRole('img', { name: /mantikor/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument()
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
    ['/library?tab=cursed', 'cardmaker_cursed'],
    ['/library?tab=true-words', 'cardmaker_true'],
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
      'custom-draft': 'cardmaker_custom',
      library: 'cardmaker_lib',
      sets: null,
      dice: null,
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
      ['/library?tab=cursed', 'cardmaker_cursed'],
      ['/library?tab=true-words', 'cardmaker_true'],
      ['/log', 'cardmaker_think'],
      ['/rules', 'cardmaker_wave'],
      ['/settings', 'cardmaker_peek'],
      ['/shops/elixirs', 'cardmaker_zaddir'],
    ])('stands the Cardmaker of %s in the corner on a wide window with a mouse', (path, stem) => {
      stubWideHover()
      renderApp({ path, cards: { cards: CARDS }, art: ART })

      expect(cornerStem()).toBe(stem)
      expect(headerMascot()).toBeNull()
    })

    it('changes the Cardmaker in the corner with the tab', async () => {
      stubWideHover()
      const user = userEvent.setup()
      renderApp({ path: '/library', cards: { cards: CARDS }, art: ART })
      expect(cornerStem()).toBe('cardmaker_lib')

      await user.click(screen.getByRole('tab', { name: /^✦ True Words/ }))

      expect(cornerStem()).toBe('cardmaker_true')
    })

    it.each(['/shops', '/library', '/rules', '/library?tab=true-words', '/settings'])(
      'shows no Cardmaker on %s on a phone',
      (path) => {
        stubPhoneWidth()
        renderApp({ path, cards: { cards: CARDS }, art: ART })

        expect(document.querySelector('img[data-mascot]')).toBeNull()
      },
    )
  })
})

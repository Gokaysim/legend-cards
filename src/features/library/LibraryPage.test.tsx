import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { ONLY_FROM_DM, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import { testTrueWord } from '@/test/trueWordFixtures'

const eyes = testCard("Aboleth's Eyes")
const draft = testCard("Bard's Encore", { status: 'draft', mechanicPack: null })
const retired = testCard('Old Card', { status: 'retired' })
const hex = testCursedCard('Hex')
const hexDraft = testCursedCard('Jinx', { status: 'draft' })
const CARDS: Card[] = [eyes, draft, retired, hex, hexDraft]

const dm = testProfile({ role: 'dm' })
const player = testProfile()

const WORDS = [
  testTrueWord('Abyss'),
  testTrueWord('Aid'),
  testTrueWord('Justice', { isInLibrary: false }),
  testTrueWord('Echo', { status: 'draft' }),
]

function renderDeck(path: string, profile = dm) {
  return renderApp({
    path,
    users: { currentProfile: ready(profile), profiles: ready([profile]) },
    cards: { cards: ready(CARDS) },
    trueWords: { words: ready(WORDS) },
  })
}

const tab = (name: RegExp) => screen.getByRole('tab', { name })

const faces = () =>
  within(screen.getByRole('list', { name: 'Kartlar' }))
    .getAllByRole('article')
    .map((card) => card.getAttribute('aria-label'))

describe('the Kütüphane tabs', () => {
  it('opens on Kartlar, with the three tabs in order and their counts', () => {
    renderDeck('/library', player)

    expect(screen.getByRole('heading', { level: 1, name: 'Kütüphane' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((item) => item.textContent)).toEqual([
      '♠ Kartlar (1)',
      '☠ Cursed (1)',
      '✦ True Words (2)',
    ])
    expect(tab(/^♠ Kartlar/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: /^♠ Kartlar/ })).toContainElement(
      screen.getByRole('article', { name: "Aboleth's Eyes" }),
    )
  })

  it("counts the DM's hidden definitions, and leaves them out of a player's counts", () => {
    const wish = testCard('The Last Wish', { ...ONLY_FROM_DM })
    const tabs = (profile: typeof dm) => {
      const view = renderApp({
        path: '/library',
        users: { currentProfile: ready(profile), profiles: ready([profile]) },
        cards: { cards: ready([...CARDS, wish]) },
        trueWords: { words: ready(WORDS) },
      })
      const labels = screen.getAllByRole('tab').map((item) => item.textContent)
      view.unmount()
      return labels
    }

    expect(tabs(player)).toEqual(['♠ Kartlar (1)', '☠ Cursed (1)', '✦ True Words (2)'])
    expect(tabs(dm)).toEqual(['♠ Kartlar (2)', '☠ Cursed (1)', '✦ True Words (3)'])
  })

  it('opens the tab its address names, and Kartlar for an unknown one', () => {
    const view = renderDeck('/library?tab=cursed', player)
    expect(tab(/^☠ Cursed/)).toHaveAttribute('aria-selected', 'true')
    expect(faces()).toEqual(['Hex'])
    view.unmount()

    renderDeck('/library?tab=notes', player)
    expect(tab(/^♠ Kartlar/)).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the open tab in the address, with the Kütüphane marked, and starts its search afresh', async () => {
    const user = userEvent.setup()
    const { router } = renderDeck('/library', player)
    await user.type(screen.getByRole('searchbox', { name: 'Kart ara' }), 'nothing like this')

    await user.click(tab(/^☠ Cursed/))
    expect(router.state.location).toMatchObject({ pathname: '/library', search: '?tab=cursed' })
    expect(faces()).toEqual(['Hex'])
    expect(
      within(screen.getByRole('navigation', { name: 'Ana menü' })).getByRole('link', {
        name: 'Kütüphane',
      }),
    ).toHaveAttribute('aria-current', 'page')

    await user.click(tab(/^♠ Kartlar/))
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('searchbox', { name: 'Kart ara' })).toHaveValue('')
    expect(faces()).toEqual(["Aboleth's Eyes"])
  })

  it.each([
    ['/library', ['+ Kart ekle', '▥ Havuz Dağılımı']],
    ['/library?tab=cursed', ['+ Kart ekle']],
    ['/library?tab=true-words', ['+ True Word ekle']],
  ])('gives the DM the actions of the tab on %s', (path, actions) => {
    renderDeck(path)
    const header = screen.getByRole('heading', { level: 1, name: 'Kütüphane' }).closest('header')
    expect(
      within(header as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(actions)
  })

  it.each([
    ['/library', ['▥ Havuz Dağılımı']],
    ['/library?tab=cursed', []],
    ['/library?tab=true-words', []],
  ])('gives a player only the pool distribution, on Kartlar (%s)', (path, actions) => {
    renderDeck(path, player)
    const header = screen.getByRole('heading', { level: 1, name: 'Kütüphane' }).closest('header')
    expect(
      within(header as HTMLElement)
        .queryAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(actions)
  })
})

describe('the DM on the Kartlar tab', () => {
  it('adds a card, browses the drafts, and edits a card', async () => {
    const user = userEvent.setup()
    renderDeck('/library')

    expect(faces()).toEqual(["Aboleth's Eyes"])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'draft')
    expect(faces()).toEqual(["Bard's Encore"])

    await user.click(screen.getByRole('button', { name: "Bard's Encore: düzenle" }))
    expect(screen.getByRole('dialog', { name: "Düzenle: Bard's Encore" })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '✕ Kapat' }))

    await user.click(screen.getByRole('button', { name: '+ Kart ekle' }))
    const form = within(screen.getByRole('dialog', { name: 'Yeni kart' }))
    expect(form.getByLabelText('Tür')).toHaveValue('normal')
  })
})

describe('the DM on the Cursed tab', () => {
  it('adds a Cursed card and finds the Cursed drafts', async () => {
    const user = userEvent.setup()
    renderDeck('/library?tab=cursed')

    expect(faces()).toEqual(['Hex'])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'draft')
    expect(faces()).toEqual(['Jinx'])

    await user.click(screen.getByRole('button', { name: '+ Kart ekle' }))
    expect(screen.getByRole('dialog', { name: 'Yeni Cursed kart' })).toBeVisible()
  })
})

describe('DM-only cards on the Kartlar and Cursed tabs', () => {
  const wish = testCard('The Last Wish', {
    ...ONLY_FROM_DM,
    holder: { uid: 'bora', userCardId: 'h-wish' },
  })
  const crown = testCursedCard('Crown of Ash', { ...ONLY_FROM_DM })

  function renderWith(path: string, profile: typeof dm) {
    return renderApp({
      path,
      users: { currentProfile: ready(profile), profiles: ready([profile]) },
      cards: { cards: ready([...CARDS, wish, crown]) },
    })
  }

  it.each([
    ['/library', ["Aboleth's Eyes"]],
    ['/library?tab=cursed', ['Hex']],
  ])("leaves them out of a player's %s and its count, also while held", (path, names) => {
    renderWith(path, player)
    expect(faces()).toEqual(names)
    expect(screen.getByText('1 kart')).toBeInTheDocument()
  })

  it.each([
    ['/library', "Aboleth's Eyes", 'The Last Wish'],
    ['/library?tab=cursed', 'Hex', 'Crown of Ash'],
  ])('lists them for the DM on %s, marked', (path, other, secret) => {
    renderWith(path, dm)
    expect(faces()?.toSorted()).toEqual([other, secret].toSorted())
    expect(screen.getByRole('article', { name: secret })).toHaveTextContent('🔒 DM')
    expect(screen.getByRole('article', { name: other })).not.toHaveTextContent('🔒 DM')
  })
})

describe('a player on the Kartlar and Cursed tabs', () => {
  it.each(['/library', '/library?tab=cursed'])(
    'sees on %s only the active cards and no DM control',
    (path) => {
      renderDeck(path, player)
      expect(faces()).toHaveLength(1)
      expect(screen.queryByRole('button', { name: '+ Kart ekle' })).toBeNull()
      expect(screen.queryByRole('combobox', { name: 'Durum' })).toBeNull()
      expect(screen.queryByRole('button', { name: /düzenle/ })).toBeNull()
    },
  )
})

describe('the history links of the Kartlar and Cursed tabs', () => {
  it("gives a player's face the clock control left of the magnifier", () => {
    renderDeck('/library', player)

    const face = screen.getByRole('article', { name: "Aboleth's Eyes" })
    const clock = within(face).getByRole('link', { name: "Aboleth's Eyes: geçmiş" })
    expect(clock).toHaveAttribute('href', `/library/${eyes.id}`)
    expect(clock).toHaveClass('right-11')
    expect(within(face).queryByRole('button', { name: /düzenle/ })).not.toBeInTheDocument()
  })

  it("puts the DM's clock control left of the edit control, which is left of the magnifier", () => {
    renderDeck('/library')

    const face = screen.getByRole('article', { name: "Aboleth's Eyes" })
    expect(within(face).getByRole('link', { name: "Aboleth's Eyes: geçmiş" })).toHaveClass(
      'right-20',
    )
    expect(within(face).getByRole('button', { name: "Aboleth's Eyes: düzenle" })).toHaveClass(
      'right-11',
    )
    expect(within(face).getByRole('button', { name: "Aboleth's Eyes: büyüt" })).toHaveClass(
      'right-2',
    )
  })

  it("opens a card's history from its name in the list view", async () => {
    const user = userEvent.setup()
    const { router } = renderDeck('/library', player)

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    await user.click(screen.getByRole('link', { name: "Aboleth's Eyes" }))

    expect(router.state.location.pathname).toBe(`/library/${eyes.id}`)
    expect(screen.getByRole('heading', { level: 1, name: "Aboleth's Eyes" })).toBeInTheDocument()
  })
})

describe('the history links of the Cursed tab', () => {
  it("opens a Cursed card's history from the clock control on its face, and leads back to the tab", async () => {
    const user = userEvent.setup()
    const { router } = renderDeck('/library?tab=cursed', player)

    const face = screen.getByRole('article', { name: 'Hex' })
    await user.click(within(face).getByRole('link', { name: 'Hex: geçmiş' }))

    expect(router.state.location.pathname).toBe(`/library/${hex.id}`)
    expect(screen.getByRole('heading', { level: 1, name: 'Hex' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '← Kütüphane' }))
    expect(router.state.location).toMatchObject({ pathname: '/library', search: '?tab=cursed' })
  })

  it("opens a Cursed card's history from its name in the list view", async () => {
    const user = userEvent.setup()
    const { router } = renderDeck('/library?tab=cursed', player)

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    await user.click(screen.getByRole('link', { name: 'Hex' }))

    expect(router.state.location.pathname).toBe(`/library/${hex.id}`)
  })
})

describe('the Cursed tab', () => {
  it('lists only the curses in play with "Yalnızca eldekiler", and counts their copies in hands', async () => {
    const user = userEvent.setup()
    const blight = testCursedCard('Blight')
    const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
    renderApp({
      path: '/library?tab=cursed',
      users: { currentProfile: ready(player), profiles: ready([player, ayla]) },
      cards: { cards: ready([...CARDS, blight]) },
      holdings: { openHoldings: ready([testHolding(hex, 'ayla', 1000)]) },
    })
    expect(faces()).toEqual(['Blight', 'Hex'])
    expect(screen.getByLabelText('Eldeki kopyalar')).toHaveTextContent('Ellerde 1')

    await user.click(screen.getByRole('checkbox', { name: 'Yalnızca eldekiler' }))

    expect(faces()).toEqual(['Hex'])
    expect(screen.getByRole('article', { name: 'Hex' })).toHaveTextContent('Elde: Ayla')
  })
})

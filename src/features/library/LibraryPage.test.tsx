import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { ONLY_FROM_DM, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

const eyes = testCard("Aboleth's Eyes")
const draft = testCard("Bard's Encore", { status: 'draft', mechanicPack: null })
const retired = testCard('Old Card', { status: 'retired' })
const hex = testCursedCard('Hex')
const hexDraft = testCursedCard('Jinx', { status: 'draft' })
const CARDS: Card[] = [eyes, draft, retired, hex, hexDraft]

const dm = testProfile({ role: 'dm' })
const player = testProfile()

function renderDeck(path: string, profile = dm) {
  return renderApp({
    path,
    users: { currentProfile: ready(profile), profiles: ready([profile]) },
    cards: { cards: ready(CARDS) },
  })
}

const faces = () =>
  within(screen.getByRole('list', { name: 'Kartlar' }))
    .getAllByRole('article')
    .map((card) => card.getAttribute('aria-label'))

describe('the DM on the Kart kütüphanesi', () => {
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

describe('the DM on the Cursed Deck', () => {
  it('adds a Cursed card and finds the Cursed drafts', async () => {
    const user = userEvent.setup()
    renderDeck('/cursed-deck')

    expect(faces()).toEqual(['Hex'])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Durum' }), 'draft')
    expect(faces()).toEqual(['Jinx'])

    await user.click(screen.getByRole('button', { name: '+ Kart ekle' }))
    expect(screen.getByRole('dialog', { name: 'Yeni Cursed kart' })).toBeVisible()
  })
})

describe('DM-only cards on the deck screens', () => {
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
    ['/cursed-deck', ['Hex']],
  ])("leaves them out of a player's %s and its count, also while held", (path, names) => {
    renderWith(path, player)
    expect(faces()).toEqual(names)
    expect(screen.getByText('1 kart')).toBeInTheDocument()
  })

  it.each([
    ['/library', "Aboleth's Eyes", 'The Last Wish'],
    ['/cursed-deck', 'Hex', 'Crown of Ash'],
  ])('lists them for the DM on %s, marked', (path, other, secret) => {
    renderWith(path, dm)
    expect(faces()?.toSorted()).toEqual([other, secret].toSorted())
    expect(screen.getByRole('article', { name: secret })).toHaveTextContent('🔒 DM')
    expect(screen.getByRole('article', { name: other })).not.toHaveTextContent('🔒 DM')
  })
})

describe('a player on the deck screens', () => {
  it.each(['/library', '/cursed-deck'])(
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

describe('the history links of the Kart kütüphanesi', () => {
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

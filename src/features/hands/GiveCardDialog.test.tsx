import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

import { HoldingError } from './errors'
import type { HoldingActions } from './holdingsContext'

afterEach(() => {
  vi.restoreAllMocks()
})

const dm = testProfile({ role: 'dm', displayName: 'Dana' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })

const eyes = testCard("Aboleth's Eyes", { setCode: 'Kesqer' })
const gaze = testCard('Aboleth Gaze', { setCode: 'Havenholm' })
const greedy = testCard('Greedy Hands', {
  setCode: 'Kesqer',
  holder: { uid: 'bora', userCardId: 'bora-greedy' },
})
const halo = testBlessedCard('Halo of Aboleths')
const visions = testCursedCard('Visions of Death', { text: 'Aboleth dreams.' })
const retired = testCard('Old Aboleth', { status: 'retired' })
const draft = testCard('Aboleth Draft', { status: 'draft' })
const wish = testCard('The Last Wish', { dmOnly: true })
const CARDS: Card[] = [eyes, gaze, greedy, halo, visions, retired, draft, wish]

function setup({
  viewer = dm,
  giveCard,
}: { viewer?: typeof dm; giveCard?: HoldingActions['giveCard'] } = {}) {
  const user = userEvent.setup()
  const give = vi.fn<HoldingActions['giveCard']>(giveCard ?? (() => Promise.resolve('new')))
  const view = renderApp({
    path: '/hands/ayla',
    users: { currentProfile: ready(viewer), profiles: ready([ayla, bora, viewer]) },
    cards: { cards: ready(CARDS) },
    holdings: {
      openHoldings: ready([testHolding(greedy, 'bora', 1000, { id: 'bora-greedy' })]),
      actions: { giveCard: give },
    },
  })
  return { user, give, ...view }
}

const dialog = () => within(screen.getByRole('dialog', { name: 'Kart ver: Ayla' }))
const results = () =>
  dialog()
    .getAllByRole('listitem')
    .map((item) => item.textContent)

async function openAndSearch(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(screen.getByRole('button', { name: '+ Kart ver' }))
  await user.type(dialog().getByRole('searchbox', { name: 'Kart ara' }), query)
}

describe('GiveCardDialog', () => {
  it('is offered to the DM only', () => {
    setup({ viewer: testProfile() })
    expect(screen.queryByRole('button', { name: '+ Kart ver' })).not.toBeInTheDocument()
  })

  it('searches every active card of both decks and shows each status', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: '+ Kart ver' }))
    expect(dialog().getByText('Vermek istediğin kartı isim, set ya da metinle ara.')).toBeVisible()
    expect(dialog().getByRole('searchbox', { name: 'Kart ara' })).toHaveFocus()

    await user.keyboard('aboleth')

    // In name order, as the library sorts names.
    expect(results()).toEqual([
      'Aboleth GazeThrone of Havenholm · HavuzdaVer',
      "Aboleth's EyesKesqerian Nights · HavuzdaVer",
      'Halo of AbolethsBlessedVer',
      'Visions of DeathCursedVer',
    ])
    expect(dialog().getByText('4 sonuç')).toBeInTheDocument()
  })

  it('gives a pool card and stays open for the next one', async () => {
    const { user, give } = setup()
    await openAndSearch(user, 'aboleth')

    await user.click(dialog().getByRole('button', { name: "Aboleth's Eyes ver" }))

    expect(give).toHaveBeenCalledExactlyOnceWith({
      cardId: eyes.id,
      uid: 'ayla',
      by: testUser.uid,
      allowExtraCopy: false,
    })
    expect(dialog().getByRole('status')).toHaveTextContent("Verildi: Aboleth's Eyes → Ayla")

    await user.click(dialog().getByRole('button', { name: 'Visions of Death ver' }))
    expect(give).toHaveBeenLastCalledWith(expect.objectContaining({ cardId: visions.id }))
    expect(screen.getByRole('dialog', { name: 'Kart ver: Ayla' })).toBeInTheDocument()
  })

  it('gives a DM-only card no one holds without asking for an extra copy', async () => {
    const { user, give } = setup()
    await openAndSearch(user, 'last wish')
    expect(results()).toEqual(["The Last WishKesqerian Nights · DM'e özelVer"])

    await user.click(dialog().getByRole('button', { name: 'The Last Wish ver' }))

    expect(give).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ cardId: wish.id, allowExtraCopy: false }),
    )
    expect(dialog().queryByText(/Ek kopya/)).not.toBeInTheDocument()
  })

  it('asks before giving an extra copy of a held card, and gives it once confirmed', async () => {
    const { user, give } = setup()
    await openAndSearch(user, 'greedy')
    expect(results()).toEqual(['Greedy HandsKesqerian Nights · Elde: BoraVer'])

    await user.click(dialog().getByRole('button', { name: 'Greedy Hands ver' }))

    expect(dialog().getByText(/Bora'nın elinde\. Ek kopya verilsin mi\?/)).toBeVisible()
    expect(give).not.toHaveBeenCalled()

    await user.click(dialog().getByRole('button', { name: 'Ek kopya ver' }))

    expect(give).toHaveBeenCalledExactlyOnceWith({
      cardId: greedy.id,
      uid: 'ayla',
      by: testUser.uid,
      allowExtraCopy: true,
    })
    expect(dialog().queryByText(/Ek kopya verilsin mi/)).not.toBeInTheDocument()
  })

  it('changes nothing when the extra copy is cancelled', async () => {
    const { user, give } = setup()
    await openAndSearch(user, 'greedy')

    await user.click(dialog().getByRole('button', { name: 'Greedy Hands ver' }))
    await user.click(dialog().getByRole('button', { name: 'Vazgeç' }))

    expect(give).not.toHaveBeenCalled()
    expect(dialog().queryByText(/Ek kopya verilsin mi/)).not.toBeInTheDocument()
  })

  it('switches to the extra-copy question when the card was just taken', async () => {
    const { user, give } = setup({
      giveCard: ({ allowExtraCopy }) =>
        allowExtraCopy ? Promise.resolve('new') : Promise.reject(new HoldingError('taken', 'bora')),
    })
    await openAndSearch(user, 'aboleth gaze')

    await user.click(dialog().getByRole('button', { name: 'Aboleth Gaze ver' }))

    expect(dialog().getByText(/Bora'nın elinde\. Ek kopya verilsin mi\?/)).toBeVisible()
    await user.click(dialog().getByRole('button', { name: 'Ek kopya ver' }))
    expect(give).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardId: gaze.id, allowExtraCopy: true }),
    )
    expect(dialog().getByRole('status')).toHaveTextContent('Verildi: Aboleth Gaze → Ayla')
  })

  it('shows a Turkish error for other failures', async () => {
    const { user } = setup({
      giveCard: () => Promise.reject(Object.assign(new Error('x'), { code: 'unavailable' })),
    })
    await openAndSearch(user, 'visions')

    await user.click(dialog().getByRole('button', { name: 'Visions of Death ver' }))

    expect(dialog().getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.',
    )
  })

  it('does not try to give a card offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, give } = setup()
    await openAndSearch(user, 'visions')

    await user.click(dialog().getByRole('button', { name: 'Visions of Death ver' }))

    expect(give).not.toHaveBeenCalled()
    expect(dialog().getByRole('alert')).toHaveTextContent('Bağlantı yok')
  })

  it('says so when nothing matches, and closes with the close button', async () => {
    const { user } = setup()
    await openAndSearch(user, 'no such card')
    expect(dialog().getByText('Kart bulunamadı.')).toBeVisible()

    await user.click(dialog().getByRole('button', { name: '✕ Kapat' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

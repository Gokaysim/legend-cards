import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testPartyPurse } from '@/test/ledgerFixtures'
import { SHOP_CARDS, testPack } from '@/test/packFixtures'
import { renderApp } from '@/test/renderApp'

import { PackError } from './errors'
import type { PackActions } from './packsContext'

const me = testProfile({ lp: 5 })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 4 })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dm = testProfile({ role: 'dm', displayName: 'Dana', lp: 0 })

const main = () => within(screen.getByRole('main'))
const packButton = (title: string) => main().getByRole('button', { name: `${title} aç` })

function renderShop({
  path = '/shops/packs',
  viewer = me,
  cards = SHOP_CARDS,
  openPack,
  ...rest
}: {
  path?: string
  viewer?: typeof me
  cards?: typeof SHOP_CARDS
  openPack?: PackActions['openPack']
} & Pick<Parameters<typeof renderApp>[0] & object, 'table' | 'packs' | 'balances'> = {}) {
  return renderApp({
    path,
    users: { currentProfile: ready(viewer), profiles: ready([ayla, bora, viewer]) },
    cards: { cards: ready(cards) },
    ...rest,
    packs: { ...rest.packs, actions: openPack ? { openPack } : rest.packs?.actions },
  })
}

describe('Pack Shop layout', () => {
  it('shows Set Packs per set ending with Pandemonium, and Mechanic Packs with the Golden Packs last', () => {
    renderShop()

    const sets = within(main().getByRole('region', { name: 'Set Packs' }))
    expect(sets.getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Kesqerian Nights Packs: paketleri gör',
      'Throne of Havenholm Packs: paketleri gör',
      'Ballad of Ulagal Packs: paketleri gör',
      'Pandemonium Packs: paketleri gör',
    ])
    const mechanics = main().getByRole('region', { name: /Mechanic Packs/ })
    expect(within(mechanics).getByRole('heading')).toHaveTextContent(
      'Mechanic Packs 4 LP / 10.000 GP',
    )
    expect(
      within(mechanics).getByRole('button', { name: 'Arcanus Divine Mechanic Pack aç' }),
    ).toBeInTheDocument()
    const items = within(mechanics).getAllByRole('listitem')
    expect(items.at(-1)).toHaveTextContent('Golden Packs')
    expect(within(mechanics).queryByText('4 LP / 10.000 GP', { selector: 'button *' })).toBeNull()
  })

  it("opens a set's packs with their prices and a way back, kept in the URL", async () => {
    const user = userEvent.setup()
    const { router } = renderShop()

    await user.click(main().getByRole('link', { name: 'Kesqerian Nights Packs: paketleri gör' }))

    expect(router.state.location.search).toBe('?group=Kesqer')
    expect(main().getByRole('heading', { name: 'Kesqerian Nights Packs' })).toBeInTheDocument()
    expect(packButton('Kesqerian Nights Standard Pack')).toHaveTextContent('2 LP / 5.000 GP')
    expect(packButton('Kesqerian Nights Premium Pack')).toHaveTextContent('3 LP / 7.500 GP')
    expect(packButton('Kesqerian Nights Cursed Pack')).toHaveTextContent('1 LP / 2.500 GP')

    await user.click(main().getByRole('link', { name: '← Pack Shop' }))
    expect(router.state.location.search).toBe('')
    expect(main().getByRole('region', { name: 'Set Packs' })).toBeInTheDocument()
  })

  it('gives Pandemonium only its two packs, and the Golden Packs their own', () => {
    renderShop({ path: '/shops/packs?group=Pandemonium' })
    expect(
      main()
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Pandemonium Pack aç', 'Pandemonium Cursed Pack aç'])
  })

  it('shows the Golden and the Cursed Golden Pack with their prices', () => {
    renderShop({ path: '/shops/packs?group=golden' })
    expect(packButton('Golden Pack')).toHaveTextContent('4 LP / 10.000 GP')
    expect(packButton('Cursed Golden Pack')).toHaveTextContent('3 LP / 7.500 GP')
  })
})

describe('when a pack can be opened', () => {
  it('disables a pack the pool has too few cards for, and says why', () => {
    renderShop({ path: '/shops/packs?group=Ulagal' })

    const standard = packButton('Ballad of Ulagal Standard Pack')
    expect(standard).toBeDisabled()
    expect(standard).toHaveAccessibleDescription(
      'Havuzda yeterli kart yok: en az 9 Ballad of Ulagal kartı gerekli, 1 var.',
    )
  })

  it('disables the Cursed types while the Cursed Deck is empty', () => {
    const cards = SHOP_CARDS.filter((card) => card.kind !== 'cursed')
    renderShop({ path: '/shops/packs?group=golden', cards })

    expect(packButton('Cursed Golden Pack')).toHaveAccessibleDescription("Cursed Deck'te kart yok.")
    expect(packButton('Golden Pack')).toBeEnabled()
  })

  it('opens nothing while a pack is open, and says whose it is', () => {
    renderShop({
      path: '/shops/packs?group=golden',
      table: { openPackId: 'pack-1' },
      packs: { pack: testPack('ayla') },
    })

    expect(packButton('Golden Pack')).toBeDisabled()
    expect(main().getByRole('status')).toHaveTextContent('Şu anda Ayla için bir Pack açık.')
  })

  it('keeps a retired Cursed card out of the Cursed Deck', () => {
    const cards = [
      ...SHOP_CARDS.filter((card) => card.kind !== 'cursed'),
      testCursedCard('Old Curse', { retired: true }),
    ]
    renderShop({ path: '/shops/packs?group=Kesqer', cards })
    expect(packButton('Kesqerian Nights Cursed Pack')).toBeDisabled()
  })
})

describe('opening a pack as a player', () => {
  it('opens into their own hand for its LP price, and closes the dialog', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>(() => Promise.resolve('pack-1'))
    renderShop({ path: '/shops/packs?group=Kesqer', openPack })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog', { name: 'Kesqerian Nights Standard Pack' }))
    expect(dialog.getByText('5 LP')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: "Pack'i aç (2 LP)" }))

    expect(openPack).toHaveBeenCalledOnce()
    expect(openPack.mock.calls[0]?.[0]).toMatchObject({
      def: { type: 'standard', setCode: 'Kesqer' },
      uid: testUser.uid,
      by: testUser.uid,
      payment: { currency: 'lp', amount: 2 },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cannot open with less LP than the price, and says how much is needed', async () => {
    const user = userEvent.setup()
    renderShop({ path: '/shops/packs?group=Kesqer', viewer: { ...me, lp: 1 } })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: "Pack'i aç (2 LP)" })).toBeDisabled()
    expect(dialog.getByText('2 LP gerekiyor.')).toBeInTheDocument()
  })

  it('names whose pack is open when another pack opened first', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>(() => Promise.reject(new PackError('busy')))
    renderShop({
      path: '/shops/packs?group=Kesqer',
      openPack,
      packs: { pack: testPack('bora', { status: 'open' }) },
    })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    await user.click(screen.getByRole('button', { name: "Pack'i aç (2 LP)" }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Şu anda Bora bir Pack açıyor. Seçim yapılınca tekrar dene.',
    )
  })
})

describe("the DM's payment", () => {
  const dmShop = (extra: Parameters<typeof renderShop>[0] = {}) =>
    renderShop({
      viewer: dm,
      balances: { partyPurse: ready(testPartyPurse(5000)) },
      ...extra,
    })

  it('opens for the player the link names, charging their LP at the price by default', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>(() => Promise.resolve('pack-1'))
    dmShop({ path: '/shops/packs?for=ayla&group=Kesqer', openPack })

    expect(main().getByRole('combobox', { name: 'Kimin için' })).toHaveValue('ayla')
    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('radio', { name: "Oyuncunun LP'si (4 LP)" })).toBeChecked()
    expect(dialog.getByRole('spinbutton', { name: 'Tutar (LP)' })).toHaveValue(2)
    await user.click(dialog.getByRole('button', { name: "Pack'i aç" }))

    expect(openPack).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        uid: 'ayla',
        by: testUser.uid,
        payment: { currency: 'lp', amount: 2 },
      }),
    )
  })

  it('starts the GP amount at the GP price, and opens for free with 0', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>(() => Promise.resolve('pack-1'))
    dmShop({ path: '/shops/packs?for=ayla&group=golden', openPack })

    await user.click(packButton('Golden Pack'))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('radio', { name: 'Grup kesesi (5.000 GP)' }))
    expect(dialog.getByRole('spinbutton', { name: 'Tutar (GP)' })).toHaveValue(10000)
    expect(dialog.getByText('0 = ücretsiz')).toBeInTheDocument()

    await user.clear(dialog.getByRole('spinbutton', { name: 'Tutar (GP)' }))
    await user.type(dialog.getByRole('spinbutton', { name: 'Tutar (GP)' }), '0')
    await user.click(dialog.getByRole('button', { name: "Pack'i aç" }))

    expect(openPack).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ payment: { currency: 'gp', amount: 0 } }),
    )
  })

  it('refuses more than the purse holds, naming the purse', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>()
    dmShop({ path: '/shops/packs?for=ayla&group=Kesqer', openPack })

    await user.click(packButton('Kesqerian Nights Premium Pack'))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('radio', { name: 'Grup kesesi (5.000 GP)' }))
    await user.click(dialog.getByRole('button', { name: "Pack'i aç" }))

    expect(dialog.getByRole('alert')).toHaveTextContent(
      'Bu Pack için 7.500 GP gerekiyor; grup kesesinde 5.000 GP var.',
    )
    expect(openPack).not.toHaveBeenCalled()
  })

  it("offers no LP for the DM's own hand, and starts with GP", async () => {
    const user = userEvent.setup()
    dmShop({ path: `/shops/packs?for=${testUser.uid}&group=Kesqer` })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('radio', { name: /Oyuncunun LP'si/ })).toBeDisabled()
    expect(dialog.getByRole('radio', { name: /Grup kesesi/ })).toBeChecked()
    expect(dialog.getByRole('spinbutton', { name: 'Tutar (GP)' })).toHaveValue(5000)
  })

  it('picks the first player who is not the DM without a link', () => {
    dmShop()
    expect(main().getByRole('combobox', { name: 'Kimin için' })).toHaveValue('ayla')
  })
})

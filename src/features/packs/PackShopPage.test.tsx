import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testPartyPurse } from '@/test/ledgerFixtures'
import { SHOP_CARDS, testPack } from '@/test/packFixtures'
import { stubWideHover } from '@/test/media'
import { renderApp } from '@/test/renderApp'

import { PackError } from './errors'
import type { PackActions } from './packsContext'

const me = testProfile({ lp: 5 })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 4 })
const bora = testProfile({ id: 'bora', displayName: 'Bora', lp: 3 })
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
} & Pick<Parameters<typeof renderApp>[0] & object, 'table' | 'packs' | 'balances' | 'art'> = {}) {
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

describe('pack pictures', () => {
  const ART = testArt({
    packs: {
      'mechanic:Blood & Battle': '/art/packs/mechanic-blood-battle.0123456789.webp',
      golden: '/art/packs/golden.0123456789.webp',
      cursedGolden: '/art/packs/cursedgolden.0123456789.webp',
    },
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      Pandemonium: '/art/backs/pandemonium.0123456789.webp',
    },
  })
  const pictureOf = (title: string) => packButton(title).querySelector('img')
  const nameOf = (title: string) => packButton(title).querySelector('[data-pack-name]')
  const priceOf = (title: string) => packButton(title).querySelector('[data-pack-price]')
  /** The tile's parts from top to bottom: `price`, `picture`, `glyph` and `name`. */
  const partsOf = (title: string) =>
    [...packButton(title).children].map((part) =>
      part.hasAttribute('data-pack-price')
        ? 'price'
        : part.hasAttribute('data-pack-name')
          ? 'name'
          : part.querySelector('img')
            ? 'picture'
            : 'glyph',
    )

  it("shows a Mechanic Pack's picture with its name under it, and no price", () => {
    renderShop({ art: ART })

    const title = 'Blood & Battle Mechanic Pack'
    expect(pictureOf(title)).toHaveAttribute(
      'src',
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(pictureOf(title)).toHaveAttribute('alt', '')
    expect(pictureOf(title)).not.toHaveClass('max-w-40')
    expect(partsOf(title)).toEqual(['picture', 'name'])
    expect(nameOf(title)).toHaveTextContent(title)
    expect(priceOf(title)).toBeNull()
  })

  it("shows a set's packs with their prices above the set's cardback, and no names", () => {
    renderShop({ path: '/shops/packs?group=Kesqer', art: ART })

    for (const [title, price] of [
      ['Kesqerian Nights Standard Pack', '2 LP / 5.000 GP'],
      ['Kesqerian Nights Premium Pack', '3 LP / 7.500 GP'],
      ['Kesqerian Nights Cursed Pack', '1 LP / 2.500 GP'],
    ] as const) {
      expect(pictureOf(title)).toHaveAttribute('src', '/art/backs/kesqer.0123456789.webp')
      expect(partsOf(title)).toEqual(['price', 'picture'])
      expect(priceOf(title)).toHaveTextContent(price)
      expect(packButton(title)).not.toHaveTextContent(title)
    }
  })

  it('names both Pandemonium packs and both Golden Packs under their pictures', () => {
    const { unmount } = renderShop({ path: '/shops/packs?group=Pandemonium', art: ART })
    for (const title of ['Pandemonium Pack', 'Pandemonium Cursed Pack']) {
      expect(partsOf(title)).toEqual(['price', 'picture', 'name'])
      expect(priceOf(title)).toHaveTextContent('3 LP / 7.500 GP')
      expect(nameOf(title)).toHaveTextContent(title)
    }
    unmount()

    renderShop({ path: '/shops/packs?group=golden', art: ART })
    for (const title of ['Golden Pack', 'Cursed Golden Pack']) {
      expect(partsOf(title)).toEqual(['price', 'picture', 'name'])
      expect(nameOf(title)).toHaveTextContent(title)
    }
  })

  it('keeps the glyph and the name for a pack without a picture', () => {
    renderShop({ path: '/shops/packs?group=Havenholm', art: ART })

    const title = 'Throne of Havenholm Standard Pack'
    expect(pictureOf(title)).toBeNull()
    expect(partsOf(title)).toEqual(['price', 'glyph', 'name'])
    expect(packButton(title)).toHaveTextContent('🎴')
    expect(nameOf(title)).toHaveTextContent(title)
  })

  it("keeps the pack's name in the button's label", () => {
    renderShop({ path: '/shops/packs?group=Kesqer', art: ART })

    expect(packButton('Kesqerian Nights Premium Pack')).toHaveAccessibleName(
      'Kesqerian Nights Premium Pack aç',
    )
  })
})

describe('group pictures', () => {
  const ART = testArt({
    packs: { golden: '/art/packs/golden.0123456789.webp' },
    cardbacks: { Kesqer: '/art/backs/kesqer.0123456789.webp' },
  })
  const groupLink = (title: string) => main().getByRole('link', { name: `${title}: paketleri gör` })

  it("shows a set's cardback on its group, with the group's name under it", () => {
    renderShop({ art: ART })

    const kesqer = groupLink('Kesqerian Nights Packs')
    expect(kesqer.querySelector('img')).toHaveAttribute('src', '/art/backs/kesqer.0123456789.webp')
    expect(kesqer.querySelector('img')).toHaveAttribute('alt', '')
    expect(kesqer.lastElementChild).toHaveTextContent('Kesqerian Nights Packs')
    expect(kesqer).not.toHaveTextContent('♜')
  })

  it('shows the Golden Pack picture on the Golden Packs', () => {
    renderShop({ art: ART })

    const golden = groupLink('Golden Packs')
    expect(golden.querySelector('img')).toHaveAttribute('src', '/art/packs/golden.0123456789.webp')
    expect(golden).toHaveTextContent('Golden Packs')
    expect(golden).not.toHaveTextContent('✦')
  })

  it('keeps the glyph and the name for a set without a cardback', () => {
    renderShop({ art: ART })

    const havenholm = groupLink('Throne of Havenholm Packs')
    expect(havenholm.querySelector('img')).toBeNull()
    expect(havenholm).toHaveTextContent('♜')
    expect(havenholm).toHaveTextContent('Throne of Havenholm Packs')
  })

  it('shows every glyph with its name where no pictures are built', () => {
    renderShop()

    for (const title of ['Kesqerian Nights Packs', 'Pandemonium Packs']) {
      expect(groupLink(title).querySelector('img')).toBeNull()
      expect(groupLink(title)).toHaveTextContent(`♜${title}`)
    }
    expect(groupLink('Golden Packs')).toHaveTextContent('✦Golden Packs')
  })
})

describe('pack frames', () => {
  const ART = testArt({
    packs: {
      'mechanic:Blood & Battle': '/art/packs/mechanic-blood-battle.0123456789.webp',
      golden: '/art/packs/golden.0123456789.webp',
      cursedGolden: '/art/packs/cursedgolden.0123456789.webp',
    },
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      Pandemonium: '/art/backs/pandemonium.0123456789.webp',
    },
  })
  const frameOf = (title: string) =>
    packButton(title).querySelector('img')?.parentElement?.getAttribute('data-pack-frame') ?? null

  it("frames a set's Premium Pack in gold and its Cursed Pack in red, and its Standard Pack not", () => {
    renderShop({ path: '/shops/packs?group=Kesqer', art: ART })

    expect(frameOf('Kesqerian Nights Premium Pack')).toBe('premium')
    expect(
      packButton('Kesqerian Nights Premium Pack').querySelector('[data-pack-frame]'),
    ).toHaveClass('pack-frame-premium')
    expect(frameOf('Kesqerian Nights Cursed Pack')).toBe('cursed')
    expect(
      packButton('Kesqerian Nights Cursed Pack').querySelector('[data-pack-frame]'),
    ).toHaveClass('pack-frame-cursed')
    expect(frameOf('Kesqerian Nights Standard Pack')).toBeNull()
  })

  it('frames the Pandemonium Cursed and Cursed Golden Packs in red, and not the others', () => {
    const { unmount } = renderShop({ path: '/shops/packs?group=Pandemonium', art: ART })
    expect(frameOf('Pandemonium Cursed Pack')).toBe('cursed')
    expect(frameOf('Pandemonium Pack')).toBeNull()
    unmount()

    renderShop({ path: '/shops/packs?group=golden', art: ART })
    expect(frameOf('Cursed Golden Pack')).toBe('cursed')
    expect(frameOf('Golden Pack')).toBeNull()
  })

  it('leaves a Mechanic Pack without a frame', () => {
    renderShop({ art: ART })
    expect(frameOf('Blood & Battle Mechanic Pack')).toBeNull()
  })

  it('lifts a pack that can be opened, and greys out one that cannot, which still says why', () => {
    renderShop({ path: '/shops/packs?group=Ulagal' })

    const standard = packButton('Ballad of Ulagal Standard Pack')
    expect(standard).toBeDisabled()
    expect(standard).toHaveClass('disabled:grayscale-45', 'disabled:opacity-60')
    expect(standard).toHaveClass('motion-safe:enabled:hover:-translate-y-0.75')
    expect(standard).toHaveAccessibleDescription(/Havuzda yeterli kart yok/)
  })
})

describe("the groups' Cardmakers", () => {
  const ART = testArt({
    mascots: {
      cardmaker_shop: '/art/mascots/cardmaker_shop.0123456789.webp',
      cardmaker_ulagal: '/art/mascots/cardmaker_ulagal.0123456789.webp',
      cardmaker_pandemonium: '/art/mascots/cardmaker_pandemonium.0123456789.webp',
      cardmaker_gold: '/art/mascots/cardmaker_gold.0123456789.webp',
    },
  })
  const mascots = () =>
    [...document.querySelectorAll('img[data-mascot]')].map((img) => img.getAttribute('data-mascot'))
  const groupRow = (title: string) =>
    main().getByRole('heading', { level: 2, name: title }).parentElement?.parentElement

  it("shows the shop's Cardmaker by the title of the main view", () => {
    renderShop({ art: ART })
    expect(mascots()).toEqual(['cardmaker_shop'])
  })

  it("shows a set group's own Cardmaker with the group's title, instead of the shop's", () => {
    renderShop({ path: '/shops/packs?group=Ulagal', art: ART })

    expect(mascots()).toEqual(['cardmaker_ulagal'])
    expect(groupRow('Ballad of Ulagal Packs')?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/mascots/cardmaker_ulagal.0123456789.webp',
    )
  })

  it("shows Pandemonium's Cardmaker, and the Golden Packs' larger", () => {
    const { unmount } = renderShop({ path: '/shops/packs?group=Pandemonium', art: ART })
    expect(mascots()).toEqual(['cardmaker_pandemonium'])
    unmount()

    renderShop({ path: '/shops/packs?group=golden', art: ART })
    expect(mascots()).toEqual(['cardmaker_gold'])
    expect(groupRow('Golden Packs')?.querySelector('img')).toHaveClass('sm:max-h-40')
  })

  it("keeps the shop's Cardmaker for a group without its own picture", () => {
    renderShop({ path: '/shops/packs?group=Kesqer', art: ART })
    expect(mascots()).toEqual(['cardmaker_shop'])
  })

  describe('on a wide window with a mouse', () => {
    beforeEach(() => stubWideHover())
    afterEach(() => vi.unstubAllGlobals())

    const corner = () => document.querySelector('[data-corner-cardmaker]')
    const titleRow = () => main().getByRole('heading', { level: 1 }).closest('header')

    it("stands the shop's Cardmaker in the corner, and none by the title", () => {
      renderShop({ art: ART })

      expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_shop')
      expect(corner()).toHaveAttribute('data-size', 'shop')
      expect(titleRow()?.querySelector('[data-mascot]')).toBeNull()
      expect(mascots()).toEqual(['cardmaker_shop'])
    })

    it("stands a set group's own Cardmaker in the corner, and none by the group's title", () => {
      renderShop({ path: '/shops/packs?group=Ulagal', art: ART })

      expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_ulagal')
      expect(groupRow('Ballad of Ulagal Packs')?.querySelector('img')).toBeNull()
      expect(mascots()).toEqual(['cardmaker_ulagal'])
    })

    it("stands the Golden Packs' Cardmaker in the corner, larger", () => {
      renderShop({ path: '/shops/packs?group=golden', art: ART })

      expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_gold')
      expect(corner()).toHaveAttribute('data-size', 'gold')
    })
  })
})

describe("the Cardmaker's speech", () => {
  const ART = testArt({
    mascots: { cardmaker_shop: '/art/mascots/cardmaker_shop.0123456789.webp' },
  })
  const bubble = () => document.querySelector('[data-speech-bubble]')
  const tileOf = (element: HTMLElement) => element.closest('li') as HTMLElement
  const rest = (element: HTMLElement) => {
    fireEvent.pointerEnter(tileOf(element), { pointerType: 'mouse' })
  }
  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // The corner's fade checks run in an animation frame; nothing here needs them.
    vi.stubGlobal('requestAnimationFrame', () => 0)
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("speaks a Mechanic Pack's line after the pointer rests on it for a second", () => {
    stubWideHover()
    renderShop({ art: ART })

    rest(packButton('Blood & Battle Mechanic Pack'))
    wait(999)
    expect(bubble()).toBeNull()

    wait(1)
    expect(bubble()).toHaveTextContent('Blood & Battle Mechanic Pack')
    expect(bubble()).toHaveTextContent(
      'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
    )
    expect(bubble()).toHaveTextContent('Aman dikkat et kendine evladım.')
  })

  it('speaks for a Mechanic Pack that cannot be opened', () => {
    stubWideHover()
    renderShop({ art: ART, table: { openPackId: 'pack-1' }, packs: { pack: testPack('ayla') } })

    const button = packButton('Blood & Battle Mechanic Pack')
    expect(button).toBeDisabled()
    rest(button)
    wait(1000)
    expect(bubble()).toHaveTextContent('Blood & Battle Mechanic Pack')
  })

  it("speaks the Golden Packs' line for the keyboard focus", () => {
    stubWideHover()
    renderShop({ art: ART })

    act(() => main().getByRole('link', { name: 'Golden Packs: paketleri gör' }).focus())
    wait(1000)

    expect(bubble()).toHaveTextContent('Golden Packs')
    expect(bubble()).toHaveTextContent('Sadece Rare kartlar ve Blessed kartlar içerir.')
    expect(bubble()).toHaveTextContent('Yavrum sandığa dikkat yalnız, bazen ısırabilir...')
  })

  it('says nothing for a set group, or inside a group', () => {
    stubWideHover()
    const { unmount } = renderShop({ art: ART })
    rest(main().getByRole('link', { name: 'Kesqerian Nights Packs: paketleri gör' }))
    wait(2000)
    expect(bubble()).toBeNull()
    unmount()

    renderShop({ path: '/shops/packs?group=Kesqer', art: ART })
    rest(packButton('Kesqerian Nights Premium Pack'))
    wait(2000)
    expect(bubble()).toBeNull()

    act(() => packButton('Kesqerian Nights Premium Pack').focus())
    wait(2000)
    expect(bubble()).toBeNull()
  })

  it('says nothing on a phone or a narrow window', () => {
    renderShop({ art: ART })

    rest(packButton('Blood & Battle Mechanic Pack'))
    wait(2000)
    expect(bubble()).toBeNull()
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

describe('what a pack holds, before paying', () => {
  const descriptionIn = (title: string) =>
    screen.getByRole('dialog', { name: title }).querySelector('[data-pack-description]')

  it("shows a Mechanic Pack's description first in its confirmation", async () => {
    const user = userEvent.setup()
    renderShop()

    await user.click(packButton('Blood & Battle Mechanic Pack'))

    const description = descriptionIn('Blood & Battle Mechanic Pack')
    expect(description).toHaveTextContent(
      'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
    )
    expect(description?.nextElementSibling?.tagName).toBe('DL')
  })

  it("shows the Golden Pack's description", async () => {
    const user = userEvent.setup()
    renderShop({ path: '/shops/packs?group=golden', viewer: dm })

    await user.click(packButton('Golden Pack'))

    expect(descriptionIn('Golden Pack')).toHaveTextContent(
      'Sadece Rare kartlar ve Blessed kartlar içerir.',
    )
  })

  it("shows no description for a set's pack", async () => {
    const user = userEvent.setup()
    renderShop({ path: '/shops/packs?group=Kesqer' })

    await user.click(packButton('Kesqerian Nights Standard Pack'))

    expect(descriptionIn('Kesqerian Nights Standard Pack')).toBeNull()
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
    expect(dialog.getByText('Kimin için').nextElementSibling).toHaveTextContent('Gökay')
    expect(dialog.queryByRole('combobox')).toBeNull()
    expect(main().queryByRole('combobox')).toBeNull()
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

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('combobox', { name: 'Kimin için' })).toHaveValue('ayla')
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

  it('picks the first player who is not the DM without a link', async () => {
    const user = userEvent.setup()
    dmShop({ path: '/shops/packs?group=Kesqer' })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    expect(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Kimin için' }),
    ).toHaveValue('ayla')
  })

  it('has no hand picker on the screen itself', () => {
    dmShop()
    expect(main().queryByRole('combobox', { name: 'Kimin için' })).toBeNull()
  })

  it('opens into the hand picked in the confirmation, and starts the next pack there', async () => {
    const user = userEvent.setup()
    const openPack = vi.fn<PackActions['openPack']>(() => Promise.resolve('pack-1'))
    const { router } = dmShop({ path: '/shops/packs?for=ayla&group=Kesqer', openPack })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    let dialog = within(screen.getByRole('dialog'))
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Kimin için' }), 'bora')
    expect(dialog.getByRole('radio', { name: "Oyuncunun LP'si (3 LP)" })).toBeChecked()
    expect(dialog.getByRole('spinbutton', { name: 'Tutar (LP)' })).toHaveValue(2)
    expect(router.state.location.search).toBe('?for=bora&group=Kesqer')
    expect(router.state.historyAction).toBe('REPLACE')
    await user.click(dialog.getByRole('button', { name: "Pack'i aç" }))

    expect(openPack).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ uid: 'bora', payment: { currency: 'lp', amount: 2 } }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(packButton('Kesqerian Nights Premium Pack'))
    dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('combobox', { name: 'Kimin için' })).toHaveValue('bora')
  })

  it('switches to the purse at the GP price when the DM picks their own hand', async () => {
    const user = userEvent.setup()
    dmShop({ path: '/shops/packs?for=ayla&group=Kesqer' })

    await user.click(packButton('Kesqerian Nights Standard Pack'))
    const dialog = within(screen.getByRole('dialog'))
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Kimin için' }), testUser.uid)

    expect(dialog.getByRole('radio', { name: /Oyuncunun LP'si/ })).toBeDisabled()
    expect(dialog.getByRole('radio', { name: /Grup kesesi/ })).toBeChecked()
    expect(dialog.getByRole('spinbutton', { name: 'Tutar (GP)' })).toHaveValue(5000)
  })
})

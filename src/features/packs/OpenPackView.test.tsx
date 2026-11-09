import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import type { PackOpening } from '@/features/draws/schema'
import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testPack } from '@/test/packFixtures'
import { renderApp } from '@/test/renderApp'

import type { PackActions } from './packsContext'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 3 })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })
const CARDS = ['A', 'B', 'C', 'D', 'E'].map((name) => testCard(name))
const VISIONS = testCursedCard('Visions of Death')
const WIND = testBlessedCard('Second Wind')
const ALL_TURNED = [0, 1, 2, 3, 4]

function fakeActions() {
  return {
    openPack: vi.fn<PackActions['openPack']>(() => Promise.resolve('pack-1')),
    turnPackCard: vi.fn<PackActions['turnPackCard']>(() => Promise.resolve()),
    choosePackCard: vi.fn<PackActions['choosePackCard']>(() => Promise.resolve('h1')),
    cancelPack: vi.fn<PackActions['cancelPack']>(() => Promise.resolve()),
  }
}

/** Renders the library as `viewer` while `pack` (Ayla's by default) is open. */
function watch({
  viewer = { ...bora, id: testUser.uid },
  pack = testPack('ayla'),
  actions = fakeActions(),
  art,
}: {
  viewer?: typeof bora
  pack?: PackOpening
  actions?: ReturnType<typeof fakeActions>
  art?: ArtManifest
} = {}) {
  const view = renderApp({
    art,
    path: '/library',
    users: { currentProfile: ready(viewer), profiles: ready([ayla, viewer]) },
    cards: { cards: ready([...CARDS, VISIONS, WIND]) },
    table: { openPackId: pack.status === 'open' ? pack.id : null },
    packs: { pack, actions },
  })
  const setPack = (next: PackOpening) => view.setPacks({ pack: next, actions })
  return { ...view, actions, setPack, user: userEvent.setup() }
}

/** Ayla herself, signed in. */
const asAyla = { ...ayla, id: testUser.uid }
const aylasPack = (overrides: Partial<PackOpening> = {}) =>
  testPack(testUser.uid, { offered: CARDS.map((card) => card.id), ...overrides })

const packDialog = () => within(screen.getByRole('dialog'))

describe('everyone watches the open pack', () => {
  it("shows another player's pack on any screen, with its cards face down and no controls", () => {
    watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }) })

    const dialog = packDialog()
    expect(
      screen.getByRole('dialog', { name: 'Ayla · Kesqerian Nights Standard Pack' }),
    ).toBeInTheDocument()
    expect(dialog.getByText('−2 LP')).toBeInTheDocument()
    expect(dialog.getAllByRole('img', { name: /: kapalı$/ })).toHaveLength(5)
    expect(dialog.queryByRole('button', { name: /çevir/ })).not.toBeInTheDocument()
    expect(dialog.getByText('Ayla seçim yapıyor…')).toBeInTheDocument()
  })

  it('turns a card over as soon as it is turned on another device', () => {
    const offered = CARDS.map((card) => card.id)
    const { setPack } = watch({ pack: testPack('ayla', { offered }) })

    setPack(testPack('ayla', { offered, revealed: [2] }))

    expect(packDialog().getByRole('article', { name: 'C' })).toBeInTheDocument()
    expect(packDialog().getAllByRole('img', { name: /: kapalı$/ })).toHaveLength(4)
  })

  it('shrinks to a banner that names the pack, and comes back from it', async () => {
    const { user } = watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }) })

    await user.click(packDialog().getByRole('button', { name: 'Küçült' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('Ayla bir Pack açıyor: Kesqerian Nights Standard Pack')
    await user.click(within(banner).getByRole('button', { name: 'Göster' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('gives every card of a pack the same back', () => {
    const offered = [CARDS[0]?.id ?? '', VISIONS.id, ...CARDS.slice(1, 5).map((card) => card.id)]
    watch({ pack: testPack('ayla', { packType: 'cursed', offered, cost: 1 }) })

    const backs = packDialog().getAllByRole('img', { name: /: kapalı$/ })
    const look = (element: HTMLElement) => element.className + element.innerHTML
    expect(new Set(backs.map(look)).size).toBe(1)
  })
})

describe('the backs of a pack', () => {
  const BACKS = testArt({
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      blessed: '/art/backs/blessed.0123456789.webp',
      cursed: '/art/backs/cursed.0123456789.webp',
    },
  })
  const backPictures = () =>
    packDialog()
      .getAllByRole('img', { name: /: kapalı$/ })
      .map((back) => back.querySelector('img')?.getAttribute('src'))

  it("shows a set pack's cards on the set's cardback", () => {
    watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }), art: BACKS })

    expect(backPictures()).toEqual(Array(5).fill('/art/backs/kesqer.0123456789.webp'))
  })

  it('shows every card of a Cursed Pack, the Cursed card included, on the Cursed cardback', () => {
    const offered = [...CARDS.slice(0, 5).map((card) => card.id), VISIONS.id]
    watch({ pack: testPack('ayla', { packType: 'cursed', offered, cost: 1 }), art: BACKS })

    expect(backPictures()).toEqual(Array(6).fill('/art/backs/cursed.0123456789.webp'))
  })

  it('keeps the neutral back for a Mechanic Pack', () => {
    const pack = testPack('ayla', {
      packType: 'mechanic',
      setCode: null,
      mechanicPack: 'Arcanus Divine',
      offered: CARDS.map((card) => card.id),
      cost: 4,
    })
    watch({ pack, art: BACKS })

    expect(backPictures()).toEqual(Array(5).fill(undefined))
  })
})

describe('the shocked Cardmaker', () => {
  const PAIR = testArt({
    mascots: {
      cardmaker_shockl: '/art/mascots/cardmaker_shockl.0123456789.webp',
      cardmaker_shockr: '/art/mascots/cardmaker_shockr.0123456789.webp',
    },
  })
  /** A Mechanic Pack with the Blessed card Second Wind third. */
  const offered = [
    CARDS[0]?.id ?? '',
    CARDS[1]?.id ?? '',
    WIND.id,
    CARDS[2]?.id ?? '',
    CARDS[3]?.id ?? '',
  ]
  const mechanicPack = (overrides: Partial<PackOpening> = {}) =>
    testPack('ayla', {
      packType: 'mechanic',
      setCode: null,
      mechanicPack: 'Arcanus Divine',
      offered,
      cost: 4,
      ...overrides,
    })
  const shocked = () => screen.queryByTestId('blessed-shock')

  it('appears for a watcher when a Blessed card turns live, and leaves after 1.1 s', () => {
    vi.useFakeTimers()
    const { setPack } = watch({ pack: mechanicPack(), art: PAIR })

    setPack(mechanicPack({ revealed: [0] }))
    expect(shocked()).not.toBeInTheDocument()

    setPack(mechanicPack({ revealed: [0, 2] }))
    expect(packDialog().getByRole('article', { name: 'Second Wind' })).toBeInTheDocument()
    expect(packDialog().getByTestId('blessed-shock')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(shocked()).not.toBeInTheDocument()
  })

  it('does not appear in a view that opens on an already turned Blessed card', () => {
    const { setPack } = watch({ pack: mechanicPack({ revealed: [2] }), art: PAIR })
    expect(packDialog().getByRole('article', { name: 'Second Wind' })).toBeInTheDocument()
    expect(shocked()).not.toBeInTheDocument()

    setPack(mechanicPack({ revealed: [2, 0] }))
    expect(shocked()).not.toBeInTheDocument()
  })
})

describe('turning cards over', () => {
  it('lets the owner turn a card', async () => {
    const { user, actions } = watch({ viewer: asAyla, pack: aylasPack() })

    await user.click(packDialog().getByRole('button', { name: 'Kart 1: çevir' }))

    expect(actions.turnPackCard).toHaveBeenCalledExactlyOnceWith('pack-1', 0)
  })

  it('lets the DM turn a card of a player’s pack', async () => {
    const { user, actions } = watch({
      viewer: dm,
      pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }),
    })

    await user.click(packDialog().getByRole('button', { name: 'Kart 4: çevir' }))

    expect(actions.turnPackCard).toHaveBeenCalledExactlyOnceWith('pack-1', 3)
  })

  it('shows the same turned cards again after a reload', () => {
    watch({ viewer: asAyla, pack: aylasPack({ revealed: [0, 3] }) })

    expect(packDialog().getByRole('article', { name: 'A' })).toBeInTheDocument()
    expect(packDialog().getByRole('article', { name: 'D' })).toBeInTheDocument()
    const turnable = packDialog()
      .getAllByRole('button', { name: /çevir/ })
      .filter((button) => !(button as HTMLButtonElement).disabled)
    expect(turnable).toHaveLength(3)
  })
})

describe('choosing a card', () => {
  it('reminds the owner to turn every card before choosing', async () => {
    const { user, actions } = watch({ viewer: asAyla, pack: aylasPack({ revealed: [0, 1, 2] }) })

    await user.click(packDialog().getByRole('button', { name: 'A: seç' }))

    expect(packDialog().getByText('Önce bütün kartları çevir.')).toBeInTheDocument()
    expect(packDialog().queryByRole('button', { name: /^Seç: / })).not.toBeInTheDocument()
    expect(actions.choosePackCard).not.toHaveBeenCalled()
  })

  it('chooses the selected card after confirming', async () => {
    const { user, actions } = watch({ viewer: asAyla, pack: aylasPack({ revealed: ALL_TURNED }) })

    await user.click(packDialog().getByRole('button', { name: 'C: seç' }))
    expect(packDialog().getByRole('button', { name: 'C: seç' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(packDialog().getByRole('button', { name: 'Seç: C' }))

    expect(actions.choosePackCard).toHaveBeenCalledExactlyOnceWith({
      drawId: 'pack-1',
      cardId: CARDS[2]?.id,
      by: testUser.uid,
    })
  })

  it('lets the DM choose for the player', async () => {
    const { user, actions } = watch({
      viewer: dm,
      pack: testPack('ayla', { offered: CARDS.map((card) => card.id), revealed: ALL_TURNED }),
    })

    await user.click(packDialog().getByRole('button', { name: 'B: seç' }))
    await user.click(packDialog().getByRole('button', { name: 'Seç: B' }))

    expect(actions.choosePackCard).toHaveBeenCalledExactlyOnceWith({
      drawId: 'pack-1',
      cardId: CARDS[1]?.id,
      by: testUser.uid,
    })
  })

  it('marks the Cursed card as mandatory, and never offers it as the choice', () => {
    const offered = [CARDS[0]?.id ?? '', VISIONS.id, ...CARDS.slice(1, 5).map((card) => card.id)]
    watch({
      viewer: asAyla,
      pack: aylasPack({ packType: 'cursed', offered, cost: 1, revealed: [0, 1, 2, 3, 4, 5] }),
    })

    expect(packDialog().getByText('Zorunlu')).toBeInTheDocument()
    expect(
      packDialog().queryByRole('button', { name: 'Visions of Death: seç' }),
    ).not.toBeInTheDocument()
    expect(packDialog().getAllByRole('button', { name: /: seç$/ })).toHaveLength(5)
    expect(packDialog().getByText(/Cursed kart zorunludur/)).toBeInTheDocument()
  })

  it('shows how the pack ended on every device that has it open', () => {
    const offered = CARDS.map((card) => card.id)
    const { setPack } = watch({ pack: testPack('ayla', { offered, revealed: ALL_TURNED }) })

    setPack(
      testPack('ayla', {
        offered,
        revealed: ALL_TURNED,
        status: 'chosen',
        closedBy: 'ayla',
        chosen: { cardId: CARDS[2]?.id ?? '', cardName: 'C', cardKind: 'normal', holdingId: 'h1' },
      }),
    )

    expect(
      packDialog().getByText("Ayla seçti: C. Kartlar Ayla'nın eline eklendi."),
    ).toBeInTheDocument()
    expect(packDialog().queryByRole('button', { name: /: seç$/ })).not.toBeInTheDocument()
  })
})

describe('the DM cancels a pack', () => {
  it('asks first, naming the refund, then cancels', async () => {
    const { user, actions } = watch({
      viewer: dm,
      pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }),
    })

    await user.click(packDialog().getByRole('button', { name: 'İptal et ve iade et' }))
    expect(
      packDialog().getByText(
        "Ayla'ya 2 LP iade edilecek. Hiçbir kart verilmez. Pack iptal edilsin mi?",
      ),
    ).toBeInTheDocument()
    await user.click(packDialog().getByRole('button', { name: 'Evet, iptal et' }))

    expect(actions.cancelPack).toHaveBeenCalledExactlyOnceWith({
      drawId: 'pack-1',
      by: testUser.uid,
    })
  })

  it('offers no cancel to the owner', () => {
    watch({ viewer: asAyla, pack: aylasPack() })
    expect(
      packDialog().queryByRole('button', { name: 'İptal et ve iade et' }),
    ).not.toBeInTheDocument()
  })

  it('says that a cancelled pack was refunded', () => {
    const offered = CARDS.map((card) => card.id)
    const { setPack } = watch({ pack: testPack('ayla', { offered }) })

    setPack(
      testPack('ayla', {
        offered,
        status: 'cancelled',
        closedBy: testUser.uid,
        refundEntryId: 'e2',
      }),
    )

    expect(packDialog().getByText('Bora iptal etti; 2 LP iade edildi.')).toBeInTheDocument()
  })
})

describe('the opening animation', () => {
  const stubMotion = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', () => ({
      matches: reduce,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))

  it('bursts the pack first, then shows the cards', () => {
    vi.useFakeTimers()
    stubMotion(false)
    watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }) })

    expect(screen.getByTestId('pack-burst')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /: kapalı$/ })).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByTestId('pack-burst')).not.toBeInTheDocument()
    expect(packDialog().getAllByRole('img', { name: /: kapalı$/ })).toHaveLength(5)
  })

  it('shows the cards at once with reduced motion', () => {
    stubMotion(true)
    watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id) }) })

    expect(screen.queryByTestId('pack-burst')).not.toBeInTheDocument()
    expect(packDialog().getAllByRole('img', { name: /: kapalı$/ })).toHaveLength(5)
  })

  it('shows the cards at once to a device that joins after the first turn', () => {
    stubMotion(false)
    watch({ pack: testPack('ayla', { offered: CARDS.map((card) => card.id), revealed: [1] }) })

    expect(screen.queryByTestId('pack-burst')).not.toBeInTheDocument()
  })
})

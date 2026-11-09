import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import type { Card } from '@/features/cards/schema'
import type { UserProfile } from '@/features/users/schema'
import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { TestDrawsProvider } from '@/test/TestDrawsProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type { DrawCardInput, DrawResult } from './api'
import { DrawDialog } from './DrawDialog'
import type { DrawActions } from './drawsContext'
import { DrawError } from './errors'

afterEach(() => {
  vi.restoreAllMocks()
})

const me = testProfile({ displayName: 'Ayla', lp: 3 })
const dm = testProfile({ id: 'dm-1', displayName: 'Dana', role: 'dm' })

const EYES = testCard("Aboleth's Eyes", { text: 'See everything.' })
const RITE = testCard('Blood Rite', { rarity: 'rare', cost: '2', mechanicPack: 'Blood & Battle' })
const HELD = testCard('Greedy Hands', { holder: { uid: 'bora', userCardId: 'h1' } })
const WIND = testBlessedCard('Second Wind')
const VISIONS = testCursedCard('Visions of Death')
const CARDS = [EYES, RITE, HELD, WIND, VISIONS]

/** A fake draw that gives each candidate in turn. */
function drawsInTurn() {
  let index = 0
  return vi.fn<DrawActions['drawCard']>(({ candidates }: DrawCardInput) => {
    const card = candidates[index % candidates.length] as Card
    index += 1
    return Promise.resolve<DrawResult>({ drawId: `d${index}`, holdingId: `h${index}`, card })
  })
}

type Setup = {
  mode?: 'random' | 'cursed'
  owner?: UserProfile
  asDm?: boolean
  cards?: Card[]
  drawCard?: DrawActions['drawCard']
  art?: ArtManifest
}

function setup({
  mode = 'random',
  owner = me,
  asDm = false,
  cards = CARDS,
  drawCard,
  art,
}: Setup = {}) {
  const user = userEvent.setup()
  const draw = vi.fn<DrawActions['drawCard']>(drawCard ?? drawsInTurn())
  const onClose = vi.fn()
  const tree = (current: UserProfile) => (
    <TestArtProvider manifest={art}>
      <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
        <TestUsersProvider currentProfile={ready(asDm ? dm : me)}>
          <TestCardsProvider cards={ready(cards)}>
            <TestDrawsProvider actions={{ drawCard: draw }}>
              <DrawDialog mode={mode} owner={current} onClose={onClose} />
            </TestDrawsProvider>
          </TestCardsProvider>
        </TestUsersProvider>
      </TestAuthProvider>
    </TestArtProvider>
  )
  const view = render(tree(owner))
  return { user, draw, onClose, setOwner: (next: UserProfile) => view.rerender(tree(next)) }
}

const control = (name: string | RegExp) => screen.getByRole('button', { name })
const backs = () => screen.queryAllByRole('button', { name: /^Kart \d+: çevir$/ })

describe("a player's draw", () => {
  it('shows the live LP, draws for 1 LP from the whole pool, and shows the card face down', async () => {
    const { user, draw, setOwner } = setup()

    expect(screen.getByRole('dialog', { name: '🎲 Kart Çek · Ayla' })).toBeInTheDocument()
    expect(screen.getByText(/Bakiye:/)).toHaveTextContent('Bakiye: 3 LP · Her kart 1 LP')
    await user.click(control('🎲 Kart Çek (1 LP)'))

    expect(draw).toHaveBeenCalledExactlyOnceWith({
      kind: 'random',
      uid: me.id,
      by: testUser.uid,
      paid: true,
      filters: null,
      candidates: [EYES, RITE, WIND],
    })
    expect(backs().map((back) => back.getAttribute('aria-label'))).toEqual(['Kart 1: çevir'])
    expect(screen.queryByText("Aboleth's Eyes")).not.toBeInTheDocument()

    setOwner({ ...me, lp: 2 })
    expect(screen.getByText(/Bakiye:/)).toHaveTextContent('Bakiye: 2 LP')
  })

  it('draws three times in a row and keeps every card, in order', async () => {
    const { user, draw, setOwner } = setup({ owner: { ...me, lp: 5 } })

    for (const lp of [4, 3, 2]) {
      await user.click(control('🎲 Kart Çek (1 LP)'))
      setOwner({ ...me, lp })
    }

    expect(draw).toHaveBeenCalledTimes(3)
    expect(backs().map((back) => back.getAttribute('aria-label'))).toEqual([
      'Kart 1: çevir',
      'Kart 2: çevir',
      'Kart 3: çevir',
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      "3 kart çekildi ve Ayla'nın eline eklendi.",
    )
    expect(screen.getByText(/Bakiye:/)).toHaveTextContent('Bakiye: 2 LP')
  })

  it('disables the control at 0 LP, with a note', () => {
    setup({ owner: { ...me, lp: 0 } })

    expect(control('🎲 Kart Çek (1 LP)')).toBeDisabled()
    expect(screen.getByText('Kart çekmek için 1 LP gerekiyor.')).toBeInTheDocument()
  })

  it('offers no filters', () => {
    setup()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/uygun kart/)).not.toBeInTheDocument()
  })
})

describe("the DM's draw", () => {
  const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 0 })

  it('is free, offers the filters, and counts the matching cards', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla })

    expect(screen.getByText('DM çekilişi ücretsizdir.')).toBeInTheDocument()
    expect(screen.getByText(/uygun kart/)).toHaveTextContent('3 uygun kart')
    const rarity = screen.getByRole('combobox', { name: 'Rarity' })
    expect(
      within(rarity)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Tümü', 'Common', 'Rare', 'Blessed'])
    expect(
      within(screen.getByRole('combobox', { name: 'Cost' }))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Tümü', '1', '2'])

    await user.selectOptions(rarity, 'Rare')
    expect(screen.getByText(/uygun kart/)).toHaveTextContent('1 uygun kart')
    await user.click(control('🎲 Kart Çek'))

    expect(draw).toHaveBeenCalledExactlyOnceWith({
      kind: 'random',
      uid: 'ayla',
      by: testUser.uid,
      paid: false,
      filters: { cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
      candidates: [RITE],
    })
  })

  it('records no filters when none is set, and matches the keyword as the library search does', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla })

    await user.click(control('🎲 Kart Çek'))
    expect(draw.mock.calls[0]?.[0].filters).toBeNull()

    await user.type(screen.getByRole('searchbox', { name: 'Kelime' }), 'blood, battle')
    expect(screen.getByText(/uygun kart/)).toHaveTextContent('1 uygun kart')
  })

  it('shows 0 matching cards and disables the control when nothing matches', async () => {
    const { user } = setup({ asDm: true, owner: ayla })

    await user.type(screen.getByRole('searchbox', { name: 'Kelime' }), 'zzz')

    expect(screen.getByText(/uygun kart/)).toHaveTextContent('0 uygun kart')
    expect(control('🎲 Kart Çek')).toBeDisabled()
  })
})

describe('the Cursed draw', () => {
  it('is free, draws from the Cursed Deck, and shows the Cursed back', async () => {
    const { user, draw } = setup({ mode: 'cursed', owner: { ...me, lp: 0 } })

    expect(screen.getByRole('dialog', { name: '☠ Cursed Kart Çek · Ayla' })).toBeInTheDocument()
    expect(screen.getByText('Ücretsiz')).toBeInTheDocument()
    expect(screen.queryByText(/Bakiye:/)).not.toBeInTheDocument()
    await user.click(control('☠ Cursed Kart Çek'))
    await user.click(control('☠ Cursed Kart Çek'))

    expect(draw).toHaveBeenCalledTimes(2)
    expect(draw.mock.calls[0]?.[0]).toMatchObject({
      kind: 'cursed',
      paid: false,
      filters: null,
      candidates: [VISIONS],
    })
    expect(backs()).toHaveLength(2)
    expect(backs()[0]).toHaveClass('border-cursed')
  })
})

describe('the backs of drawn cards', () => {
  /** Every cardback has a picture, so a back that showed the card's own would show. */
  const BACKS = testArt({
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      blessed: '/art/backs/blessed.0123456789.webp',
      cursed: '/art/backs/cursed.0123456789.webp',
    },
  })

  it("keeps the neutral back for a random draw's Blessed card, as for any other", async () => {
    const { user } = setup({ cards: [WIND, EYES], art: BACKS })
    await user.click(control('🎲 Kart Çek (1 LP)'))
    await user.click(control('🎲 Kart Çek (1 LP)'))

    const [blessedBack, normalBack] = backs()
    expect(blessedBack?.querySelector('img')).toBeNull()
    expect(blessedBack).toHaveTextContent('✦')
    expect(blessedBack?.outerHTML.replace('Kart 1', 'Kart 2')).toBe(normalBack?.outerHTML)
  })

  it('shows the Cursed cardback for a Cursed draw', async () => {
    const { user } = setup({ mode: 'cursed', art: BACKS })
    await user.click(control('☠ Cursed Kart Çek'))

    expect(backs()[0]?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/backs/cursed.0123456789.webp',
    )
  })
})

describe('the shocked Cardmaker', () => {
  const PAIR = testArt({
    mascots: {
      cardmaker_shockl: '/art/mascots/cardmaker_shockl.0123456789.webp',
      cardmaker_shockr: '/art/mascots/cardmaker_shockr.0123456789.webp',
    },
  })
  const shocked = () => screen.queryByTestId('blessed-shock')

  afterEach(() => {
    vi.useRealTimers()
  })

  it('appears when a drawn Blessed card is turned, and leaves after 1.1 s', async () => {
    const { user } = setup({ cards: [WIND, EYES], art: PAIR })
    await user.click(control('🎲 Kart Çek (1 LP)'))
    vi.useFakeTimers()

    fireEvent.click(control('Kart 1: çevir'))

    expect(screen.getByRole('article', { name: 'Second Wind' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByTestId('blessed-shock')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(shocked()).not.toBeInTheDocument()
  })

  it('does not appear for a card that is not Blessed', async () => {
    const { user } = setup({ cards: [EYES], art: PAIR })
    await user.click(control('🎲 Kart Çek (1 LP)'))

    await user.click(control('Kart 1: çevir'))

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(shocked()).not.toBeInTheDocument()
  })
})

describe('the drawn cards', () => {
  it('turn over when selected', async () => {
    const { user } = setup()
    await user.click(control('🎲 Kart Çek (1 LP)'))

    await user.click(control('Kart 1: çevir'))

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toHaveTextContent(
      'See everything.',
    )
  })

  it('stay drawn when the dialog closes without flipping', async () => {
    const { user, draw, onClose } = setup()
    await user.click(control('🎲 Kart Çek (1 LP)'))

    await user.click(control('✕ Kapat'))

    expect(onClose).toHaveBeenCalledOnce()
    await expect(draw.mock.results[0]?.value).resolves.toMatchObject({ card: EYES })
  })
})

describe('while drawing and when a draw fails', () => {
  it('keeps the control busy while a draw runs, so a double tap draws once', async () => {
    let finish: (result: DrawResult) => void = () => {}
    const { user, draw } = setup({
      drawCard: () =>
        new Promise<DrawResult>((resolve) => {
          finish = resolve
        }),
    })

    await user.click(control('🎲 Kart Çek (1 LP)'))
    const busy = control('Çekiliyor…')
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    await user.click(busy)
    expect(draw).toHaveBeenCalledOnce()

    finish({ drawId: 'd1', holdingId: 'h1', card: EYES })
    expect(await screen.findByRole('button', { name: 'Kart 1: çevir' })).toBeInTheDocument()
  })

  it.each([
    [new DrawError('insufficient', 0), "Kart çekmek için 1 LP gerekiyor; Ayla'nın 0 LP'si var."],
    [new DrawError('nothing-to-draw'), 'Çekilebilecek kart yok.'],
    [
      new DrawError('retries-exhausted'),
      'Kart çekilemedi: kartlar o sırada başka ellere geçti. Tekrar dene.',
    ],
    [
      Object.assign(new Error('denied'), { code: 'permission-denied' }),
      'Bu işlem için yetkin yok.',
    ],
    [new Error('boom'), 'Kart çekilemedi. Tekrar dene.'],
  ])('explains %s in Turkish and adds no card', async (error, message) => {
    const { user } = setup({ drawCard: () => Promise.reject(error) })

    await user.click(control('🎲 Kart Çek (1 LP)'))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(backs()).toHaveLength(0)
  })

  it('needs a connection, and draws nothing offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, draw } = setup()

    await user.click(control('🎲 Kart Çek (1 LP)'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: kart çekmek için internet bağlantısı gerekiyor.',
    )
    expect(draw).not.toHaveBeenCalled()
  })

  it('says so when no card can be drawn', () => {
    setup({ cards: [HELD, VISIONS] })

    expect(screen.getByText('Çekilebilecek kart yok.')).toBeInTheDocument()
    expect(control('🎲 Kart Çek (1 LP)')).toBeDisabled()
  })
})

describe('zooming a drawn card', () => {
  it('zooms a turned card, and closing the zoom view leaves the draw open', async () => {
    const { user, onClose } = setup()
    await user.click(control('🎲 Kart Çek (1 LP)'))
    await user.click(control('Kart 1: çevir'))
    const draw = screen.getByRole('dialog', { name: '🎲 Kart Çek · Ayla' })

    await user.click(within(draw).getByRole('button', { name: "Aboleth's Eyes: büyüt" }))

    const zoom = screen.getByRole<HTMLDialogElement>('dialog', { name: "Aboleth's Eyes" })
    expect(zoom).toHaveTextContent('Kesqerian Nights · Cost 1 · Common')
    act(() => zoom.close())

    expect(screen.getAllByRole('dialog')).toEqual([draw])
    expect(onClose).not.toHaveBeenCalled()
    expect(within(draw).getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
  })
})

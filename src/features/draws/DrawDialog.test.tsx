import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import type { Card } from '@/features/cards/schema'
import type { UserProfile } from '@/features/users/schema'
import type { CardSet } from '@/features/sets/schema'
import { testArt, testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testSession } from '@/test/drawFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { TEST_SETS, TEST_SETS_WITH_PICTURES } from '@/test/setFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { TestDrawsProvider } from '@/test/TestDrawsProvider'
import { TestSetsProvider } from '@/test/TestSetsProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type { DrawCardInput, DrawResult } from './api'
import { DrawDialog } from './DrawDialog'
import type { DrawActions } from './drawsContext'
import type { DrawSession } from './schema'
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
  sets?: readonly CardSet[]
  /** More fake draw steps. */
  actions?: Partial<DrawActions>
  sessions?: readonly DrawSession[]
}

function setup({
  mode = 'random',
  owner = me,
  asDm = false,
  cards = CARDS,
  drawCard,
  art,
  sets = TEST_SETS,
  actions = {},
  sessions = [],
}: Setup = {}) {
  const user = userEvent.setup()
  const draw = vi.fn<DrawActions['drawCard']>(drawCard ?? drawsInTurn())
  const onClose = vi.fn()
  const setsReady = ready([...sets])
  const endDrawSession = vi.fn<DrawActions['endDrawSession']>(() => Promise.resolve())
  const turnDrawCard = vi.fn<DrawActions['turnDrawCard']>(() => Promise.resolve())
  let sessionCount = 0
  const newSessionId = vi.fn(() => `s${(sessionCount += 1)}`)
  const fakes = { drawCard: draw, endDrawSession, turnDrawCard, newSessionId, ...actions }
  let currentSessions = sessions
  let currentOwner = owner
  const tree = (current: UserProfile) => (
    <TestArtProvider manifest={art}>
      <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
        <TestUsersProvider currentProfile={ready(asDm ? dm : me)}>
          <TestSetsProvider sets={setsReady}>
            <TestCardsProvider cards={ready(cards)}>
              <TestDrawsProvider actions={fakes} sessions={currentSessions}>
                <DrawDialog mode={mode} owner={current} onClose={onClose} />
              </TestDrawsProvider>
            </TestCardsProvider>
          </TestSetsProvider>
        </TestUsersProvider>
      </TestAuthProvider>
    </TestArtProvider>
  )
  const view = render(tree(owner))
  return {
    user,
    draw,
    onClose,
    endDrawSession,
    turnDrawCard,
    newSessionId,
    unmount: view.unmount,
    setOwner: (next: UserProfile) => {
      currentOwner = next
      view.rerender(tree(next))
    },
    setSessions: (next: readonly DrawSession[]) => {
      currentSessions = next
      view.rerender(tree(currentOwner))
    },
  }
}

const control = (name: string | RegExp) => screen.getByRole('button', { name })
const backs = () => screen.queryAllByRole('button', { name: /^Kart \d+: çevir$/ })
/** The player's LP pill: "Bakiye: 3 LP" for screen readers, "3 LP" on screen. */
const balance = () => screen.getByText(/Bakiye:/).parentElement as HTMLElement
const deckCount = () => screen.getByText(/uygun kart$/)
/** The chips above the table, as read on screen. */
const chips = () =>
  within(screen.getByRole('list', { name: 'Çekiş' }))
    .getAllByRole('listitem')
    .map((chip) => chip.textContent)
const pill = (name: RegExp) => screen.getByRole('button', { name })
const item = (name: string) => screen.getByRole('menuitemradio', { name })
const menuNames = () =>
  screen.getAllByRole('menuitemradio').map((menuItem) => menuItem.getAttribute('aria-label'))

describe("a player's draw", () => {
  it('shows the live LP, draws for 1 LP from the whole pool, and shows the card face down', async () => {
    const { user, draw, setOwner } = setup()

    expect(screen.getByRole('dialog', { name: '🎲 Kart Çek · Ayla' })).toBeInTheDocument()
    expect(balance()).toHaveTextContent('Bakiye: 3 LP')
    expect(screen.getByText('Her kart 1 LP')).toBeInTheDocument()
    expect(deckCount()).toHaveTextContent('3 uygun kart')
    await user.click(control('🎲 Çek · 1 LP'))

    expect(draw).toHaveBeenCalledExactlyOnceWith({
      kind: 'random',
      uid: me.id,
      by: testUser.uid,
      paid: true,
      filters: null,
      candidates: [EYES, RITE, WIND],
      sessionId: expect.any(String) as string,
    })
    expect(backs().map((back) => back.getAttribute('aria-label'))).toEqual(['Kart 1: çevir'])
    expect(screen.queryByText("Aboleth's Eyes")).not.toBeInTheDocument()
    // The fan: overlapping, slightly turned cards that lift under the pointer or the focus, unless motion is reduced.
    expect(backs()[0]?.closest('li')).toHaveClass(
      '-mr-3',
      'motion-safe:-rotate-3',
      'motion-safe:hover:-translate-y-2.5',
      'motion-safe:focus-within:-translate-y-2.5',
      'hover:z-50',
    )
    expect(backs()[0]?.closest('li')?.className).not.toMatch(/(^|\s)-?rotate-/)

    setOwner({ ...me, lp: 2 })
    expect(balance()).toHaveTextContent('Bakiye: 2 LP')
  })

  it('draws three times in a row and keeps every card, in order', async () => {
    const { user, draw, setOwner } = setup({ owner: { ...me, lp: 5 } })

    for (const lp of [4, 3, 2]) {
      await user.click(control('🎲 Çek · 1 LP'))
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
    expect(balance()).toHaveTextContent('Bakiye: 2 LP')
  })

  it('disables the control at 0 LP, with a note', () => {
    setup({ owner: { ...me, lp: 0 } })

    expect(control('🎲 Çek · 1 LP')).toBeDisabled()
    expect(screen.getByText('Kart çekmek için 1 LP gerekiyor.')).toBeInTheDocument()
  })

  it('offers no filters and no look into the deck', () => {
    setup()

    expect(screen.queryByRole('group', { name: 'Filtreler' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Destede ne var?' })).not.toBeInTheDocument()
  })
})

describe("the DM's draw", () => {
  const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 0 })
  const DESERT = testCard('Desert Rite', {
    setCode: 'Kesqer',
    rarity: 'rare',
    cost: '1',
    mechanicPack: 'Risk & Reward',
  })
  const OATH = testCard('Sand Oath', { setCode: 'Kesqer', rarity: 'rare', cost: '5' })
  const MARKET = testCard('Market Day', { setCode: 'Kesqer', rarity: 'common', cost: '1' })
  const HARBOR = testCard('Harbor Light', { setCode: 'Havenholm', rarity: 'rare', cost: '2' })
  const SONG = testCard('Last Song', {
    setCode: 'Ulagal',
    holder: { uid: 'bora', userCardId: 'h9' },
  })
  const SET_CARDS = [DESERT, OATH, MARKET, HARBOR, SONG, WIND, VISIONS]

  const choose = async (
    user: ReturnType<typeof userEvent.setup>,
    pillName: RegExp,
    itemName: string,
  ) => {
    await user.click(pill(pillName))
    await user.click(item(itemName))
  }

  it('is free, offers the filter pills, and counts the matching cards on the deck', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla })

    expect(chips()).toEqual(['🎲 Rastgele', "Ayla'nın eline", 'Ücretsiz'])
    expect(deckCount()).toHaveTextContent('3 uygun kart')
    await user.click(pill(/^Rarity/))
    expect(menuNames()).toEqual(['Tümü', 'Common, 1 kart', 'Rare, 1 kart', 'Blessed, 1 kart'])
    await user.click(item('Rare, 1 kart'))
    await user.click(pill(/^Cost/))
    expect(menuNames()).toEqual(['Tümü', '1, 0 kart', '2, 1 kart'])
    await user.keyboard('{Escape}')

    expect(deckCount()).toHaveTextContent('1 uygun kart')
    await user.click(control('🎲 Çek'))

    expect(draw).toHaveBeenCalledExactlyOnceWith({
      kind: 'random',
      uid: 'ayla',
      by: testUser.uid,
      paid: false,
      filters: { setCode: null, cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
      candidates: [RITE],
      sessionId: expect.any(String) as string,
    })
  })

  it('draws from one set, and records its code', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla, cards: SET_CARDS })

    await choose(user, /^Set/, 'Kesqerian Nights, 3 kart')
    await choose(user, /^Rarity/, 'Rare, 2 kart')
    expect(deckCount()).toHaveTextContent('2 uygun kart')
    await user.click(control('🎲 Çek'))

    expect(draw.mock.calls[0]?.[0]).toMatchObject({
      filters: { setCode: 'Kesqer', cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
      candidates: [DESERT, OATH],
    })
  })

  it('lists the sets with drawable cards in the shop order, without "Blessed"', async () => {
    const { user } = setup({ asDm: true, owner: ayla, cards: SET_CARDS })

    await user.click(pill(/^Set/))

    // The shop order puts Kesqer (5) before Havenholm (8); Ulagal's only card is held.
    expect(menuNames()).toEqual(['Tümü', 'Kesqerian Nights, 3 kart', 'Throne of Havenholm, 1 kart'])
  })

  it('counts each choice under the other filters, and keeps a chosen value at 0', async () => {
    const { user } = setup({ asDm: true, owner: ayla, cards: SET_CARDS })

    await choose(user, /^Set/, 'Kesqerian Nights, 3 kart')
    await user.click(pill(/^Rarity/))
    expect(menuNames()).toEqual(['Tümü', 'Common, 1 kart', 'Rare, 2 kart', 'Blessed, 0 kart'])
    await user.click(item('Tümü'))

    await choose(user, /^Cost/, '5, 1 kart')
    await choose(user, /^Mechanic Pack/, 'Risk & Reward, 0 kart')
    expect(pill(/^Cost: 5/)).toBeInTheDocument()
    await user.click(pill(/^Cost: 5/))
    expect(item('5, 0 kart')).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Escape}')
    expect(deckCount()).toHaveTextContent('0 uygun kart')
    expect(control('🎲 Çek')).toBeDisabled()
  })

  it('clears the filters with "Temizle", and starts without filters when opened again', async () => {
    const { user } = setup({ asDm: true, owner: ayla, cards: SET_CARDS })
    await choose(user, /^Set/, 'Kesqerian Nights, 3 kart')
    await choose(user, /^Rarity/, 'Rare, 2 kart')

    await user.click(control('Temizle'))
    expect(deckCount()).toHaveTextContent('5 uygun kart')
    expect(pill(/^Set$/)).toBeInTheDocument()

    await choose(user, /^Rarity/, 'Rare, 3 kart')
    await user.click(control('✕ Kapat'))
    setup({ asDm: true, owner: ayla, cards: SET_CARDS })
    expect(screen.getAllByText(/uygun kart$/).at(-1)).toHaveTextContent('5 uygun kart')
  })

  it('records no filters when none is set, and matches the keyword as the library search does', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla })

    await user.click(control('🎲 Çek'))
    expect(draw.mock.calls[0]?.[0].filters).toBeNull()

    await user.type(screen.getByRole('searchbox', { name: 'Kelime' }), 'blood, battle')
    expect(deckCount()).toHaveTextContent('1 uygun kart')
  })

  it('shows 0 matching cards and disables the control when nothing matches', async () => {
    const { user } = setup({ asDm: true, owner: ayla })

    await user.type(screen.getByRole('searchbox', { name: 'Kelime' }), 'zzz')

    expect(deckCount()).toHaveTextContent('0 uygun kart')
    expect(control('🎲 Çek')).toBeDisabled()
  })

  it('looks into the deck: the matching cards face up, by name, without changing the draw', async () => {
    const { user, draw } = setup({ asDm: true, owner: ayla, cards: SET_CARDS })
    await choose(user, /^Set/, 'Kesqerian Nights, 3 kart')

    await user.click(control('Destede ne var?'))

    const peek = screen.getByRole('list', { name: 'Destedeki kartlar' })
    expect(
      within(peek)
        .getAllByRole('article')
        .map((face) => face.getAttribute('aria-label')),
    ).toEqual(['Desert Rite', 'Market Day', 'Sand Oath'])
    await user.click(control('🎲 Çek'))
    expect(draw.mock.calls[0]?.[0].candidates).toEqual([DESERT, OATH, MARKET])

    await user.click(control('Destede ne var?'))
    expect(screen.queryByRole('list', { name: 'Destedeki kartlar' })).not.toBeInTheDocument()
  })

  it('shows 20 cards of the deck at a time', async () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      testCard(`Card ${String(index).padStart(2, '0')}`),
    )
    const { user } = setup({ asDm: true, owner: ayla, cards: many })

    await user.click(control('Destede ne var?'))
    const faces = () =>
      within(screen.getByRole('list', { name: 'Destedeki kartlar' })).getAllByRole('article')
    expect(faces()).toHaveLength(20)
    await user.click(control('Daha fazla göster'))
    expect(faces()).toHaveLength(25)
    expect(screen.queryByRole('button', { name: 'Daha fazla göster' })).not.toBeInTheDocument()
  })
})

describe('the Cursed draw', () => {
  it('is free, draws from the Cursed Deck, and shows the Cursed back', async () => {
    const { user, draw } = setup({ mode: 'cursed', owner: { ...me, lp: 0 } })

    expect(screen.getByRole('dialog', { name: '☠ Cursed Kart Çek · Ayla' })).toBeInTheDocument()
    expect(screen.getByText('Ücretsiz')).toBeInTheDocument()
    expect(screen.queryByText(/Bakiye:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filtreler' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Destede ne var?' })).not.toBeInTheDocument()
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

describe('the behavior flags in draws', () => {
  it('draws only the cards with "Kart çekmede çıkar" on, and repeatable ones while held', async () => {
    const shared = testCard('Shared Luck', {
      isRepeatable: true,
      holder: null,
    })
    const unlisted = testCard('Quiet Card', { isInDraws: false })
    const { user, draw } = setup({ cards: [unlisted, shared, HELD, VISIONS] })

    await user.click(control('🎲 Çek · 1 LP'))

    expect(draw.mock.calls[0]?.[0].candidates).toEqual([shared])
  })

  it('draws only the Cursed cards with "Cursed Deck\'te çıkar" on, and not a held one with one copy', async () => {
    const hidden = testCursedCard('Hex', { isInDraws: false })
    const held = testCursedCard('Crown of Ash', {
      isRepeatable: false,
      holder: { uid: 'bora', userCardId: 'h-crown' },
    })
    const { user, draw } = setup({ mode: 'cursed', cards: [hidden, held, VISIONS] })

    await user.click(control('☠ Cursed Kart Çek'))

    expect(draw.mock.calls[0]?.[0].candidates).toEqual([VISIONS])
  })

  it('disables the Cursed draw when no Cursed card is in the deck by its flags', () => {
    setup({ mode: 'cursed', cards: [testCursedCard('Hex', { isInDraws: false }), EYES] })

    expect(screen.getByText('Çekilebilecek kart yok.')).toBeInTheDocument()
    expect(control('☠ Cursed Kart Çek')).toBeDisabled()
  })
})

describe('double-clicking a drawn card', () => {
  it('turns a face-down card over without zooming it', async () => {
    const { user } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    const back = backs()[0] as HTMLElement

    // In a browser, the first click turns the card and the second lands on the face that appeared.
    fireEvent.pointerDown(back, { pointerType: 'mouse' })
    fireEvent.click(back, { detail: 1 })
    const face = screen.getByRole('article', { name: "Aboleth's Eyes" })
    fireEvent.pointerDown(face, { pointerType: 'mouse' })
    fireEvent.click(face, { detail: 2 })

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.queryByRole('dialog', { name: "Aboleth's Eyes" })).not.toBeInTheDocument()
  })

  it('zooms a turned card on a double click', async () => {
    const { user } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    await user.click(backs()[0] as HTMLElement)

    await user.dblClick(screen.getByRole('article', { name: "Aboleth's Eyes" }))

    expect(screen.getByRole('dialog', { name: "Aboleth's Eyes" })).toBeInTheDocument()
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
    await user.click(control('🎲 Çek · 1 LP'))
    await user.click(control('🎲 Çek · 1 LP'))

    const [blessedBack, normalBack] = backs()
    expect(blessedBack?.querySelector('img')).toBeNull()
    expect(blessedBack).toHaveTextContent('✦')
    expect(blessedBack?.outerHTML.replace('Kart 1', 'Kart 2')).toBe(normalBack?.outerHTML)
  })

  it("shows the chosen set's cardback on the deck and on the cards drawn under it", async () => {
    const KESQER_BACK = testPictureUrl(testPicturePath('set', 'kesqer'))
    // Test cards are of the set Kesqer unless they say otherwise.
    const harbor = testCard('Harbor Light', { setCode: 'Havenholm' })
    const { user } = setup({
      asDm: true,
      cards: [harbor, EYES],
      art: BACKS,
      sets: TEST_SETS_WITH_PICTURES,
    })
    const deckBack = () => screen.getByTestId('deck-pile').getAttribute('data-back')

    expect(deckBack()).toBe('css-neutral')
    await user.click(control('🎲 Çek'))
    await user.click(pill(/^Set/))
    await user.click(item('Kesqerian Nights, 1 kart'))
    expect(deckBack()).toBe(KESQER_BACK)
    await user.click(control('🎲 Çek'))

    const [first, second] = backs()
    expect(first?.querySelector('img')).toBeNull()
    expect(second?.querySelector('img')).toHaveAttribute('src', KESQER_BACK)
  })

  it('keeps the neutral back for a draw with only a rarity', async () => {
    const { user } = setup({ asDm: true, cards: [RITE], art: BACKS, sets: TEST_SETS_WITH_PICTURES })
    await user.click(pill(/^Rarity/))
    await user.click(item('Rare, 1 kart'))
    await user.click(control('🎲 Çek'))

    expect(screen.getByTestId('deck-pile')).toHaveAttribute('data-back', 'css-neutral')
    expect(backs()[0]?.querySelector('img')).toBeNull()
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
    await user.click(control('🎲 Çek · 1 LP'))
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
    await user.click(control('🎲 Çek · 1 LP'))

    await user.click(control('Kart 1: çevir'))

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(shocked()).not.toBeInTheDocument()
  })
})

describe('the drawn cards', () => {
  it('turn over when selected', async () => {
    const { user } = setup()
    await user.click(control('🎲 Çek · 1 LP'))

    await user.click(control('Kart 1: çevir'))

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toHaveTextContent(
      'See everything.',
    )
  })

  it('stay drawn when the dialog closes without flipping', async () => {
    const { user, draw, onClose } = setup()
    await user.click(control('🎲 Çek · 1 LP'))

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

    await user.click(control('🎲 Çek · 1 LP'))
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

    await user.click(control('🎲 Çek · 1 LP'))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(backs()).toHaveLength(0)
  })

  it('needs a connection, and draws nothing offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, draw } = setup()

    await user.click(control('🎲 Çek · 1 LP'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: kart çekmek için internet bağlantısı gerekiyor.',
    )
    expect(draw).not.toHaveBeenCalled()
  })

  it('says so when no card can be drawn', () => {
    setup({ cards: [HELD, VISIONS] })

    expect(screen.getByText('Çekilebilecek kart yok.')).toBeInTheDocument()
    expect(control('🎲 Çek · 1 LP')).toBeDisabled()
  })
})

describe('zooming a drawn card', () => {
  it('zooms a turned card, and closing the zoom view leaves the draw open', async () => {
    const { user, onClose } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    await user.click(control('Kart 1: çevir'))
    const draw = screen.getByRole('dialog', { name: '🎲 Kart Çek · Ayla' })

    await user.click(within(draw).getByRole('button', { name: "Aboleth's Eyes: büyüt" }))

    const zoom = screen.getByRole<HTMLDialogElement>('dialog', { name: "Aboleth's Eyes" })
    expect(zoom).not.toHaveTextContent('Kesqerian Nights · Cost 1 · Common')
    act(() => zoom.close())

    expect(screen.getAllByRole('dialog')).toEqual([draw])
    expect(onClose).not.toHaveBeenCalled()
    expect(within(draw).getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
  })
})

describe('the live draw (spec: live-draws)', () => {
  it("shows the chips of a player's table: the kind, the hand, the LP and the price", () => {
    setup()
    expect(chips()).toEqual(['🎲 Rastgele', "Ayla'nın eline", 'Bakiye: 3 LP', 'Her kart 1 LP'])
  })

  it('says under the table that everyone sees the draw live', () => {
    setup()
    const line = screen.getByText(/Herkes bu çekişi canlı görür/)
    expect(line).toHaveTextContent(
      'Herkes bu çekişi canlı görür; çevirdiğin kartlar onlarda da döner.',
    )
    expect(within(line).getByTestId('live-mark')).toBeInTheDocument()
  })

  it('tints the Cursed table red', () => {
    setup({ mode: 'cursed' })
    expect(screen.getByTestId('draw-table')).toHaveAttribute('data-tone', 'cursed')
    expect(chips()[0]).toBe('☠ Cursed')
  })

  it('draws every card of one dialog into one session, and turns a card for everyone', async () => {
    const { user, draw, turnDrawCard, newSessionId } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    await user.click(control('🎲 Çek · 1 LP'))

    expect(newSessionId).toHaveBeenCalledOnce()
    expect(draw.mock.calls.map(([input]) => input.sessionId)).toEqual(['s1', 's1'])
    await user.click(control('Kart 2: çevir'))
    expect(turnDrawCard).toHaveBeenCalledExactlyOnceWith('s1', 1)
  })

  it('turns a card over when it is turned on another device', async () => {
    const { user, setSessions } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    expect(backs()).toHaveLength(1)

    setSessions([testSession(me.id, [EYES], Date.now(), { id: 's1', turned: [0] })])

    expect(control('Kart 1: çevir')).toBeDisabled()
    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
  })

  it('ends the session once when the dialog closes', async () => {
    const { user, endDrawSession, unmount } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    unmount()
    expect(endDrawSession).toHaveBeenCalledExactlyOnceWith('s1', testUser.uid)
  })

  it('ends nothing when no card was drawn', () => {
    const { endDrawSession, newSessionId, unmount } = setup()
    unmount()
    expect(newSessionId).not.toHaveBeenCalled()
    expect(endDrawSession).not.toHaveBeenCalled()
  })

  it('ends the session only after a draw still running has settled', async () => {
    let finish: (result: DrawResult) => void = () => {}
    const { user, endDrawSession, unmount } = setup({
      drawCard: () =>
        new Promise<DrawResult>((resolve) => {
          finish = resolve
        }),
    })
    await user.click(control('🎲 Çek · 1 LP'))
    unmount()
    expect(endDrawSession).not.toHaveBeenCalled()

    await act(async () => {
      finish({ drawId: 'd1', holdingId: 'h1', card: EYES })
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(endDrawSession).toHaveBeenCalledExactlyOnceWith('s1', testUser.uid)
    })
  })

  it('starts a new session at the next draw once its session went stale', async () => {
    const { user, draw, setSessions } = setup()
    await user.click(control('🎲 Çek · 1 LP'))
    setSessions([testSession(me.id, [EYES], Date.now() - 11 * 60 * 1000, { id: 's1' })])

    await user.click(control('🎲 Çek · 1 LP'))

    expect(draw.mock.calls.map(([input]) => input.sessionId)).toEqual(['s1', 's2'])
  })

  it('draws again into a new session when the DM ended it meanwhile', async () => {
    const draw = vi
      .fn<DrawActions['drawCard']>()
      .mockRejectedValueOnce(new DrawError('session-ended'))
      .mockResolvedValueOnce({ drawId: 'd1', holdingId: 'h1', card: EYES })
    const { user } = setup({ drawCard: draw })

    await user.click(control('🎲 Çek · 1 LP'))

    expect(draw.mock.calls.map(([input]) => input.sessionId)).toEqual(['s1', 's2'])
    expect(backs()).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

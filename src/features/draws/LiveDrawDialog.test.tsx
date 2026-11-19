import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import type { UserProfile } from '@/features/users/schema'
import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testSession } from '@/test/drawFixtures'
import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { TestDrawsProvider } from '@/test/TestDrawsProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type { DrawActions } from './drawsContext'
import { LiveDrawDialog } from './LiveDrawDialog'
import type { DrawSession } from './schema'
import type { SessionState } from './sessions'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 2 })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dana = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })
const PROFILES = [ayla, bora, dana]

const EYES = testCard("Aboleth's Eyes", { text: 'See everything.' })
const RITE = testCard('Blood Rite', { rarity: 'rare' })
const WIND = testBlessedCard('Second Wind')
const VISIONS = testCursedCard('Visions of Death')
const CARDS = [EYES, RITE, WIND, VISIONS]

const profileOf = (uid: string) => PROFILES.find((profile) => profile.id === uid)

type Setup = {
  session: DrawSession
  /** Who watches: Bora by default. */
  viewer?: UserProfile
  state?: SessionState
  art?: ArtManifest
}

function setup({ session, viewer = bora, state = 'open', art }: Setup) {
  const user = userEvent.setup()
  const turnDrawCard = vi.fn<DrawActions['turnDrawCard']>(() => Promise.resolve())
  const endDrawSession = vi.fn<DrawActions['endDrawSession']>(() => Promise.resolve())
  const onClose = vi.fn()
  const tree = (current: DrawSession, currentState: SessionState) => (
    <TestArtProvider manifest={art}>
      <TestAuthProvider state={signedInAs({ ...testUser, uid: viewer.id })}>
        <TestUsersProvider currentProfile={ready(viewer)} profiles={ready(PROFILES)}>
          <TestCardsProvider cards={ready(CARDS)}>
            <TestDrawsProvider actions={{ turnDrawCard, endDrawSession }}>
              <LiveDrawDialog
                session={current}
                state={currentState}
                profileOf={profileOf}
                onClose={onClose}
              />
            </TestDrawsProvider>
          </TestCardsProvider>
        </TestUsersProvider>
      </TestAuthProvider>
    </TestArtProvider>
  )
  const view = render(tree(session, state))
  return {
    user,
    turnDrawCard,
    endDrawSession,
    onClose,
    update: (next: DrawSession, nextState: SessionState = 'open') =>
      view.rerender(tree(next, nextState)),
  }
}

const chips = () =>
  within(screen.getByRole('list', { name: 'Çekiş' }))
    .getAllByRole('listitem')
    .map((chip) => chip.textContent)
const faceDown = () => screen.getAllByRole('img', { name: /^Kart \d+: kapalı$/ })

describe('LiveDrawDialog', () => {
  it("shows a player's paid draw: whose hand, the price, and the cards face down", () => {
    setup({ session: testSession('ayla', [EYES, RITE], 1000) })

    expect(screen.getByRole('dialog', { name: 'Ayla kart çekiyor' })).toBeInTheDocument()
    expect(chips()).toEqual(['Canlı', '🎲 Rastgele', "Ayla'nın eline", '−2 LP'])
    expect(faceDown()).toHaveLength(2)
    expect(screen.queryByText("Aboleth's Eyes")).not.toBeInTheDocument()
    expect(screen.getByText('Ayla kartları çeviriyor…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Küçült' })).toBeInTheDocument()
  })

  it("adds up the prices set while the mode is on, also for the DM's draw", () => {
    const session = testSession('ayla', [EYES, RITE], 1000, {
      by: 'dana',
      draws: [
        { drawId: 'd1', cardId: EYES.id, backSet: null, cost: 1 },
        { drawId: 'd2', cardId: RITE.id, backSet: null, cost: 2 },
      ],
    })
    setup({ session })

    expect(chips()).toEqual(['Canlı', '🎲 Rastgele', "Ayla'nın eline", '−3 LP'])
  })

  it("shows a player's draws at 0 LP as free", () => {
    const session = testSession('ayla', [EYES], 1000, {
      draws: [{ drawId: 'd1', cardId: EYES.id, backSet: null, cost: 0 }],
    })
    setup({ session })

    expect(chips()).toContain('Ücretsiz')
  })

  it('counts the cards of an older session, stored without prices, by the old rule', () => {
    const older = (session: DrawSession) => ({
      ...session,
      draws: session.draws.map((draw) => ({ ...draw, cost: null })),
    })
    const { update } = setup({ session: older(testSession('ayla', [EYES, RITE], 1000)) })
    expect(chips()).toContain('−2 LP')

    update(older(testSession('ayla', [EYES, RITE], 1000, { by: 'dana' })))
    expect(chips()).toContain('Ücretsiz')
  })

  it("names the DM's draw into a hand, free, without any filter", () => {
    const session = testSession('ayla', [RITE], 1000, {
      by: 'dana',
      draws: [{ drawId: 'd1', cardId: RITE.id, backSet: 'Kesqer', cost: 0 }],
    })
    setup({ session })

    expect(screen.getByRole('dialog', { name: "Dana, Ayla'ya kart çekiyor" })).toBeInTheDocument()
    expect(chips()).toEqual(['Canlı', '🎲 Rastgele', "Ayla'nın eline", 'Ücretsiz'])
    expect(screen.queryByText(/Kesqerian Nights|Rare|filtre/)).not.toBeInTheDocument()
  })

  it("shows a set-filtered draw's card with the set's cardback", () => {
    const art = testArt({ cardbacks: { Kesqer: '/art/backs/kesqer.0123456789.webp' } })
    const session = testSession('ayla', [RITE], 1000, {
      by: 'dana',
      draws: [{ drawId: 'd1', cardId: RITE.id, backSet: 'Kesqer', cost: 0 }],
    })
    setup({ session, art })

    expect(faceDown()[0]?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/backs/kesqer.0123456789.webp',
    )
  })

  it("shows a random draw's cards on their own backs, and the deck on the neutral back", () => {
    const art = testArt({
      cardbacks: {
        Kesqer: '/art/backs/kesqer.0123456789.webp',
        blessed: '/art/backs/blessed.0123456789.webp',
      },
    })
    setup({ session: testSession('ayla', [WIND, EYES], 1000), art })

    const [blessedBack, setBack] = faceDown()
    expect(blessedBack?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/backs/blessed.0123456789.webp',
    )
    expect(setBack?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/backs/kesqer.0123456789.webp',
    )
    expect(screen.getByTestId('deck-pile')).toHaveAttribute('data-back', 'css-neutral')
  })

  it('turns a card over when it is turned on another device', () => {
    const session = testSession('ayla', [EYES, RITE], 1000)
    const { update } = setup({ session })

    update({ ...session, turned: [1] })

    expect(screen.getByRole('article', { name: 'Blood Rite' })).toBeInTheDocument()
    expect(faceDown()).toHaveLength(1)
  })

  it('gives another player no control to turn the cards', () => {
    setup({ session: testSession('ayla', [EYES], 1000) })
    expect(screen.queryByRole('button', { name: /çevir$/ })).not.toBeInTheDocument()
  })

  it("lets the hand's owner turn a card the DM drew into their hand", async () => {
    const session = testSession('bora', [EYES], 1000, { by: 'dana' })
    const { user, turnDrawCard } = setup({ session })

    await user.click(screen.getByRole('button', { name: 'Kart 1: çevir' }))

    expect(turnDrawCard).toHaveBeenCalledExactlyOnceWith(session.id, 0)
  })

  it('lets the DM turn the cards and end the session', async () => {
    const session = testSession('ayla', [EYES], 1000)
    const { user, turnDrawCard, endDrawSession } = setup({ session, viewer: dana })

    await user.click(screen.getByRole('button', { name: 'Kart 1: çevir' }))
    await user.click(screen.getByRole('button', { name: 'Bitir' }))

    expect(turnDrawCard).toHaveBeenCalledExactlyOnceWith(session.id, 0)
    expect(endDrawSession).toHaveBeenCalledExactlyOnceWith(session.id, 'dana')
  })

  it('shows how the session ended, with every card face up, until it is closed', async () => {
    const session = testSession('ayla', [EYES, RITE, WIND], 1000)
    const { user, update, onClose } = setup({ session })

    update({ ...session, endedBy: 'ayla' }, 'ended')

    expect(screen.getByRole('dialog', { name: 'Ayla kart çekti' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Çekiş bitti: 3 kart Ayla'nın eline eklendi.",
    )
    expect(screen.queryAllByRole('img', { name: /kapalı$/ })).toHaveLength(0)
    expect(chips()).not.toContain('Canlı')
    expect(screen.queryByText('Ayla kartları çeviriyor…')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '✕ Kapat' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a Cursed draw on the red table', () => {
    setup({ session: testSession('bora', [VISIONS], 1000, { by: 'dana' }), viewer: ayla })

    expect(
      screen.getByRole('dialog', { name: "Dana, Bora'ya Cursed kart çekiyor" }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('draw-table')).toHaveAttribute('data-tone', 'cursed')
    expect(chips()).toEqual(['Canlı', '☠ Cursed', "Bora'nın eline", 'Ücretsiz'])
  })

  it('shows the shocked pair when a Blessed card turns on another device', () => {
    const art = testArt({
      mascots: {
        cardmaker_shockl: '/art/mascots/cardmaker_shockl.0123456789.webp',
        cardmaker_shockr: '/art/mascots/cardmaker_shockr.0123456789.webp',
      },
    })
    const session = testSession('ayla', [WIND], 1000)
    const { update } = setup({ session, art })
    expect(screen.queryByTestId('blessed-shock')).not.toBeInTheDocument()

    update({ ...session, turned: [0] })

    expect(screen.getByTestId('blessed-shock')).toBeInTheDocument()
  })
})

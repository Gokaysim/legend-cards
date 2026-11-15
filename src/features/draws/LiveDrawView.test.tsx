import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testSession } from '@/test/drawFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

import type { DrawActions } from './drawsContext'
import type { DrawSession } from './schema'

afterEach(() => {
  vi.useRealTimers()
})

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 3 })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dana = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })
/** The viewer: Cem, a player, or the DM Dana when `asDm`. */
const cem = testProfile({ displayName: 'Cem' })

const EYES = testCard("Aboleth's Eyes")
const RITE = testCard('Blood Rite')
const VISIONS = testCursedCard('Visions of Death')

function watch(sessions: readonly DrawSession[], { asDm = false } = {}) {
  const viewer = asDm ? { ...dana, id: testUser.uid } : cem
  const endDrawSession = vi.fn<DrawActions['endDrawSession']>(() => Promise.resolve())
  const turnDrawCard = vi.fn<DrawActions['turnDrawCard']>(() => Promise.resolve())
  const actions = { endDrawSession, turnDrawCard }
  const view = renderApp({
    path: '/library',
    users: { currentProfile: ready(viewer), profiles: ready([ayla, bora, dana, viewer]) },
    cards: { cards: ready([EYES, RITE, VISIONS]) },
    draws: { sessions, actions },
  })
  return {
    ...view,
    endDrawSession,
    turnDrawCard,
    setSessions: (next: readonly DrawSession[]) => view.setDraws({ sessions: next, actions }),
  }
}

const watching = (name: string) => screen.queryByRole('dialog', { name })
const banner = (text: RegExp) =>
  screen.getAllByRole('status').find((status) => text.test(status.textContent))

describe('LiveDrawView', () => {
  it("shows another player's draw on any screen, expanded", () => {
    watch([testSession('ayla', [EYES], Date.now())])
    expect(watching('Ayla kart çekiyor')).toBeInTheDocument()
  })

  it("shows the DM's draw into a player's hand to the other players", () => {
    watch([testSession('bora', [VISIONS], Date.now(), { by: 'dana' })])
    expect(watching("Dana, Bora'ya Cursed kart çekiyor")).toBeInTheDocument()
  })

  it("never shows the user's own session", () => {
    watch([testSession('ayla', [EYES], Date.now(), { by: testUser.uid })], { asDm: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not open a session that had ended before this device saw it', () => {
    watch([testSession('ayla', [EYES], Date.now(), { endedBy: 'ayla' })])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/kart çek/)).not.toBeInTheDocument()
  })

  it('expands the newest of two sessions, and shows the other as its banner', async () => {
    const first = testSession('ayla', [EYES], Date.now() - 1000)
    const { setSessions } = watch([first])
    const second = testSession('bora', [RITE], Date.now())

    setSessions([second, first])

    expect(watching('Bora kart çekiyor')).toBeInTheDocument()
    expect(watching('Ayla kart çekiyor')).not.toBeInTheDocument()
    expect(banner(/Ayla kart çekiyor · 1 kart · 0 açık/)).toBeDefined()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Göster' }))

    expect(watching('Ayla kart çekiyor')).toBeInTheDocument()
    expect(watching('Bora kart çekiyor')).not.toBeInTheDocument()
    expect(banner(/Bora kart çekiyor/)).toBeDefined()
  })

  it('shrinks to a banner only on this device, and drops the banner when the session ends', async () => {
    const session = testSession('ayla', [EYES, RITE], Date.now(), { turned: [0] })
    const { setSessions, endDrawSession, turnDrawCard } = watch([session])

    await userEvent.setup().click(screen.getByRole('button', { name: 'Küçült' }))

    expect(watching('Ayla kart çekiyor')).not.toBeInTheDocument()
    expect(banner(/Ayla kart çekiyor · 2 kart · 1 açık/)).toBeDefined()
    expect(endDrawSession).not.toHaveBeenCalled()
    expect(turnDrawCard).not.toHaveBeenCalled()

    setSessions([{ ...session, endedBy: 'ayla' }])

    expect(screen.queryByText(/Ayla kart çek/)).not.toBeInTheDocument()
  })

  it('keeps an expanded session that ended until it is closed', async () => {
    const session = testSession('ayla', [EYES], Date.now())
    const { setSessions } = watch([session])

    setSessions([{ ...session, endedBy: 'ayla' }])

    expect(watching('Ayla kart çekti')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '✕ Kapat' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a session as ended after 10 minutes without a change', () => {
    vi.useFakeTimers()
    watch([testSession('ayla', [EYES], Date.now())])
    expect(watching('Ayla kart çekiyor')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 30 * 1000)
    })

    expect(watching('Ayla kart çekti')).toBeInTheDocument()
  })

  it("gives the DM a banner control that ends a player's session", async () => {
    const session = testSession('ayla', [EYES], Date.now())
    const { endDrawSession } = watch([session], { asDm: true })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Küçült' }))

    await user.click(screen.getByRole('button', { name: 'Bitir' }))

    expect(endDrawSession).toHaveBeenCalledExactlyOnceWith(session.id, testUser.uid)
  })
})

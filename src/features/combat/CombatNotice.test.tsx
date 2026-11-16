import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testCharacter } from '@/test/characterFixtures'
import {
  testCharacterCombatant,
  testCombat,
  testNpcCombatant,
  testRunningCombat,
} from '@/test/combatFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { TURN_NOTICE_MS } from './CombatNotice'

const ME = testProfile({ displayName: 'Ayla' })
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const THORN = testCharacter('Thorn', testUser.uid)
const KUZGUN = testCharacter('Kuzgun', testUser.uid)
const ELARA = testCharacter('Elara', 'bora')
const CHARACTERS = ready([THORN, KUZGUN, ELARA])

const goblin = testNpcCombatant('Goblin', 0, 'dm-1')
const thorn = testCharacterCombatant(THORN, 1, { die: 12 })
const elara = testCharacterCombatant(ELARA, 2, { die: 9 })
const order = [goblin.id, thorn.id, elara.id]

function renderAt(path: string, options: RenderAppOptions = {}) {
  return renderApp({
    path,
    users: { currentProfile: ready(ME), profiles: ready([ME, BORA]) },
    characters: { characters: CHARACTERS },
    ...options,
  })
}

const askNotice = () => screen.queryByRole('status', { name: 'İnisiyatif isteniyor' })
const turnNotice = () => screen.queryByRole('status', { name: 'Sıra sende' })

afterEach(() => {
  vi.useRealTimers()
})

describe('"İnisiyatif isteniyor"', () => {
  const waiting = {
    combat: testCombat(),
    combatants: [testCharacterCombatant(THORN, 0), testCharacterCombatant(KUZGUN, 1)],
  }

  it("shows away from the Zarlar screen with the user's characters, and opens the İnisiyatif tab", async () => {
    const user = userEvent.setup()
    const { router } = renderAt('/hands', { combat: waiting })
    expect(askNotice()).toHaveTextContent('Thorn, Kuzgun')

    await user.click(within(askNotice() as HTMLElement).getByRole('link'))
    expect(router.state.location.pathname).toBe('/dice')
    expect(router.state.location.search).toBe('?tab=inisiyatif')
    expect(askNotice()).not.toBeInTheDocument()
  })

  it('does not show on the Zarlar screen', () => {
    renderAt('/dice', { combat: waiting })
    expect(askNotice()).not.toBeInTheDocument()
  })

  it('does not show when nothing of the user waits', () => {
    renderAt('/hands', {
      combat: { combat: testCombat(), combatants: [testCharacterCombatant(ELARA, 0)] },
    })
    expect(askNotice()).not.toBeInTheDocument()
  })

  it('goes when the user rolls, and stays closed after "Kapat"', async () => {
    const user = userEvent.setup()
    const view = renderAt('/hands', { combat: waiting })
    await user.click(within(askNotice() as HTMLElement).getByRole('button', { name: 'Kapat' }))
    expect(askNotice()).not.toBeInTheDocument()
    view.setCombat({ ...waiting, combatants: [...waiting.combatants] })
    expect(askNotice()).not.toBeInTheDocument()
  })
})

describe('"Sıra sende"', () => {
  const fight = (turn: number, turnAt: Timestamp | null = null) => ({
    combat: testRunningCombat(order, { turn, turnAt }),
    combatants: [goblin, thorn, elara],
  })

  it("shows on any screen when one of the user's characters becomes active, and closes after 6 seconds", () => {
    vi.useFakeTimers()
    const view = renderAt('/hands', { combat: fight(0) })
    expect(turnNotice()).not.toBeInTheDocument()

    view.setCombat(fight(1))
    expect(turnNotice()).toHaveTextContent('Sıra sende: Thorn')
    act(() => {
      vi.advanceTimersByTime(TURN_NOTICE_MS)
    })
    expect(turnNotice()).not.toBeInTheDocument()
  })

  it('shows on the Zarlar screen too', () => {
    const view = renderAt('/dice', { combat: fight(0) })
    view.setCombat(fight(1))
    expect(turnNotice()).toHaveTextContent('Sıra sende: Thorn')
  })

  it("shows nothing for an NPC's or another player's turn", () => {
    const view = renderAt('/hands', { combat: fight(1) })
    view.setCombat(fight(2))
    expect(turnNotice()).not.toBeInTheDocument()
    view.setCombat(fight(0))
    expect(turnNotice()).not.toBeInTheDocument()
  })

  it('shows nothing for the turn that was active when the app loaded', () => {
    renderAt('/hands', { combat: fight(1) })
    expect(turnNotice()).not.toBeInTheDocument()
  })

  it('shows nothing for a turn change older than 10 seconds', () => {
    const view = renderAt('/hands', { combat: fight(0) })
    view.setCombat(fight(1, Timestamp.fromMillis(Date.now() - 60_000)))
    expect(turnNotice()).not.toBeInTheDocument()
  })
})

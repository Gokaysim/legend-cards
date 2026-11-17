import { act, fireEvent, screen, within } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testHiddenRoll, testRoll } from '@/test/diceFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { lastSeenKey, resetDeviceSettingsMemory } from './deviceSettings'
import { NOTICE_MS } from './DiceNotice'

const PROFILES = ready([
  testProfile(),
  testProfile({ id: 'bora', displayName: 'Bora' }),
  testProfile({ id: 'cem', displayName: 'Cem' }),
  testProfile({ id: 'dm-1', displayName: 'Dana', role: 'dm' }),
])

function renderShell(options: RenderAppOptions = {}) {
  return renderApp({ path: '/rules', users: { profiles: PROFILES }, ...options })
}

const card = () => screen.queryByRole('complementary', { name: /atışı$/ })
const boraRoll = () =>
  testRoll({ by: 'bora', dice: [['d20', 18]], content: { note: 'Kapıyı kırmak' } })

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a roll arrives on another screen', () => {
  it("shows another user's roll in a card with the roller, the note, the formula and the total", () => {
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })

    const notice = card()
    expect(notice).toHaveAccessibleName('Bora atışı')
    expect(notice).toHaveTextContent('Kapıyı kırmak')
    expect(notice).toHaveTextContent('1d20 + 3')
    expect(notice).toHaveTextContent('Toplam: 21')
    expect(
      within(notice as HTMLElement).getByRole('link', { name: 'Kanalda aç' }),
    ).toBeInTheDocument()
  })

  it('shows the roll without dice: no tray, no throw', () => {
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    const notice = card() as HTMLElement
    expect(within(notice).queryByTestId('flat-dice')).not.toBeInTheDocument()
    expect(within(notice).queryByText('Zarlar yükleniyor')).not.toBeInTheDocument()
    expect(within(notice).queryByRole('list', { name: 'Zarlar' })).not.toBeInTheDocument()
  })

  it('shows a long formula whole, with the fixed number as written', () => {
    const roll = testRoll({
      by: 'bora',
      dice: [
        ['d20', 12],
        ['d4', 3],
      ],
      content: { modifier: 11, modifierSum: '5+10-4' },
    })
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    const line = within(card() as HTMLElement).getByText(/1d20 \+ 1d4 \+ 5 \+ 10 − 4/)
    expect(line).toHaveTextContent('1d20 + 1d4 + 5 + 10 − 4 · 12 + 3 + 5 + 10 − 4')
    expect(line).not.toHaveClass('truncate')
    expect(card()).toHaveTextContent('Toplam: 26')
  })

  it('sits at the bottom right of a wide window and at the top of a phone', () => {
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    expect(card()).toHaveClass('top-2.5', 'sm:top-auto', 'sm:bottom-5', 'sm:right-5')
  })

  it('opens the channel with "Kanalda aç", and closes', () => {
    const roll = boraRoll()
    const { router } = renderShell({ dice: { rolls: [roll], fresh: roll } })
    fireEvent.click(screen.getByRole('link', { name: 'Kanalda aç' }))
    expect(router.state.location.pathname).toBe('/dice')
    expect(card()).not.toBeInTheDocument()
  })

  it("shows no card for the user's own roll", () => {
    const mine = testRoll({ by: testUser.uid })
    renderShell({ dice: { rolls: [mine], fresh: mine } })
    expect(card()).not.toBeInTheDocument()
  })

  it('shows no card on the Zarlar screen, where the strip plays the roll', () => {
    const roll = boraRoll()
    renderShell({ path: '/dice', dice: { rolls: [roll], fresh: roll } })
    expect(card()).not.toBeInTheDocument()
  })

  it("shows no card for the DM's hidden roll on a player's device", () => {
    const hidden = testHiddenRoll()
    renderShell({ dice: { rolls: [hidden], fresh: hidden } })
    expect(card()).not.toBeInTheDocument()
  })

  it('shows no card when "Atışları göster" is off', () => {
    window.localStorage.setItem('lcm.dice.show', '0')
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    expect(card()).not.toBeInTheDocument()
  })

  it('replaces the card with a newer roll', () => {
    const first = boraRoll()
    const second = testRoll({ by: 'cem', dice: [['d6', 5]], content: { modifier: 0 } })
    const view = renderShell({ dice: { rolls: [first], fresh: first } })
    view.setDice({ rolls: [first, second], fresh: second })
    expect(card()).toHaveAccessibleName('Cem atışı')
    expect(card()).toHaveTextContent('Toplam: 5')
  })
})

describe('the notification card closes on its own', () => {
  it('closes 6 seconds after it appears', () => {
    expect(NOTICE_MS).toBe(6000)
    vi.useFakeTimers()
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    expect(card()).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(NOTICE_MS - 100)
    })
    expect(card()).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(card()).not.toBeInTheDocument()
  })

  it('stays open while the pointer is on it', () => {
    vi.useFakeTimers()
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    fireEvent.pointerEnter(card() as HTMLElement)
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS * 3)
    })
    expect(card()).toBeInTheDocument()

    fireEvent.pointerLeave(card() as HTMLElement)
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS + 100)
    })
    expect(card()).not.toBeInTheDocument()
  })

  it('stays open while the focus is in it', () => {
    vi.useFakeTimers()
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    act(() => {
      screen.getByRole('button', { name: 'Kapat' }).focus()
    })
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS * 3)
    })
    expect(card()).toBeInTheDocument()
  })

  it('stays open after it is selected, until "Kapat"', () => {
    vi.useFakeTimers()
    const roll = boraRoll()
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    fireEvent.click(card() as HTMLElement)
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS * 5)
    })
    expect(card()).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
    expect(card()).not.toBeInTheDocument()
  })
})

describe('rolls the user has not seen', () => {
  const badge = () => screen.queryByTestId('unseen-rolls')
  const madeAt = (millis: number) => Timestamp.fromMillis(millis)

  it("counts other users' rolls since the user last had the Zarlar screen open", () => {
    window.localStorage.setItem(lastSeenKey(testUser.uid), '5000')
    renderShell({
      dice: {
        rolls: [
          testRoll({ by: 'cem', at: madeAt(4000) }),
          testRoll({ by: 'bora', at: madeAt(6000) }),
          testRoll({ by: 'cem', at: madeAt(7000) }),
          testRoll({ by: testUser.uid, at: madeAt(8000) }),
          testHiddenRoll({ at: madeAt(9000) }),
        ],
      },
    })
    expect(badge()).toHaveTextContent('2')
  })

  it('reads "9+" above 9', () => {
    window.localStorage.setItem(lastSeenKey(testUser.uid), '0')
    const rolls = Array.from({ length: 12 }, (_, index) =>
      testRoll({ by: 'bora', at: madeAt(1000 + index) }),
    )
    renderShell({ dice: { rolls } })
    expect(badge()).toHaveTextContent('9+')
  })

  it('clears the count when the Zarlar screen opens', () => {
    window.localStorage.setItem(lastSeenKey(testUser.uid), '0')
    const rolls = [testRoll({ by: 'bora', at: madeAt(1000) })]
    renderShell({ path: '/dice', dice: { rolls } })
    expect(badge()).not.toBeInTheDocument()
  })

  it('starts counting from the first visit of the device', () => {
    renderShell({ dice: { rolls: [testRoll({ by: 'bora', at: madeAt(1000) })] } })
    expect(badge()).not.toBeInTheDocument()
    expect(Number(window.localStorage.getItem(lastSeenKey(testUser.uid)))).toBeGreaterThan(1000)
  })

  it('keeps counting with "Atışları göster" off, while no card opens', () => {
    window.localStorage.setItem('lcm.dice.show', '0')
    window.localStorage.setItem(lastSeenKey(testUser.uid), '0')
    const roll = testRoll({ by: 'bora', at: madeAt(1000) })
    renderShell({ dice: { rolls: [roll], fresh: roll } })
    expect(card()).not.toBeInTheDocument()
    expect(badge()).toHaveTextContent('1')
  })
})

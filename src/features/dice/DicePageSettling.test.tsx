import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testRoll } from '@/test/diceFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { stubMedia } from '@/test/media'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { SETTLE_MAX_MS } from './DicePage'
import { resetDeviceSettingsMemory } from './deviceSettings'
import type { DieMotion } from './schema'
import type { DiceStageProps } from './stage/DiceStage'

vi.mock('./webgl', () => ({ canDraw3d: () => true }))

// The 3D part, reduced to what the screen relies on: a throw that rests when the test says so, and the dice at rest at
// once when it does not play, as the real stage does.
vi.mock('./stage/DiceStage', () => ({
  DiceStage: ({ roll, playing, onRest }: DiceStageProps) => {
    useLayoutEffect(() => {
      if (!playing) onRest?.()
    }, [playing, onRest])
    return (
      <button type="button" onClick={() => onRest?.()}>
        {`${roll.id} ${playing ? 'plays' : 'at rest'}`}
      </button>
    )
  },
}))

const ME = testProfile()
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const CEM = testProfile({ id: 'cem', displayName: 'Cem' })
const PROFILES = ready([ME, BORA, CEM])

const still = { x: 0, y: 0, z: 0 }
const motionOf = (count: number): DieMotion[] =>
  Array.from({ length: count }, () => ({
    throw: {
      position: still,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: still,
      angularVelocity: still,
    },
    rest: { position: still, rotation: { x: 0, y: 0, z: 0, w: 1 } },
  }))

/** A roll with motion, so the strip plays it in "3D". */
function thrown(by: string, d20: number, modifier = 5) {
  return testRoll({ by, dice: [['d20', d20]], content: { modifier, motion: motionOf(1) } })
}

function renderDice(options: RenderAppOptions = {}) {
  return renderApp({ path: '/dice', users: { profiles: PROFILES }, ...options })
}

const channel = () => screen.getByRole('list', { name: 'Atışlar' })
const entryOf = (name: string) => within(channel()).getByRole('listitem', { name: `${name} atışı` })
/** The entry shows its result: no blur, nothing hidden from assistive technology, and its total. */
function expectShown(name: string, total: number) {
  const entry = entryOf(name)
  expect(entry).not.toHaveTextContent('sonuç bekleniyor')
  expect(within(entry).getByTestId('roll-result')).not.toHaveAttribute('aria-hidden')
  expect(within(entry).getByTestId('roll-result')).not.toHaveClass('blur-sm')
  expect(entry).toHaveTextContent(`Toplam: ${total}`)
}

/** The entry hides its result until the dice rest. */
function expectHidden(name: string) {
  const entry = entryOf(name)
  expect(entry).toHaveTextContent('sonuç bekleniyor')
  expect(within(entry).getByTestId('roll-result')).toHaveAttribute('aria-hidden', 'true')
  expect(within(entry).getByTestId('roll-result')).toHaveClass('blur-sm')
}

const restButton = async (rollId: string) =>
  screen.findByRole('button', { name: `${rollId} plays` })

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
  stubMedia()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('results hidden until the dice rest', () => {
  it("hides a new roll's result while its dice tumble, and shows it when they rest", async () => {
    const user = userEvent.setup()
    const bora = thrown('bora', 18)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })

    expect(entryOf('Bora')).toHaveTextContent('1d20 + 5')
    expectHidden('Bora')

    await user.click(await restButton(bora.id))

    expectShown('Bora', 23)
  })

  it("hides the user's own roll the same way", () => {
    const mine = thrown(testUser.uid, 7)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [mine], fresh: mine })
    expectHidden('Gökay')
  })

  it('shows neither "Nat 20" nor its border while hidden', async () => {
    const user = userEvent.setup()
    const bora = thrown('bora', 20)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })

    expect(within(entryOf('Bora')).queryByText('Nat 20')).not.toBeInTheDocument()
    expect(entryOf('Bora').querySelector('.border-gold')).toBeNull()

    await user.click(await restButton(bora.id))
    expect(within(entryOf('Bora')).getByText('Nat 20')).toBeInTheDocument()
    expect(entryOf('Bora').querySelector('.border-gold')).not.toBeNull()
  })

  it("shows the older roll's result when a newer one replaces it, and hides the newer one", async () => {
    const bora = thrown('bora', 18)
    const cem = thrown('cem', 4)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })
    await restButton(bora.id)
    view.setDice({ rolls: [bora, cem], fresh: cem })

    expectShown('Bora', 23)
    expectHidden('Cem')
  })

  it('hides nothing when a roll is played again with "Tekrar izle"', async () => {
    const user = userEvent.setup()
    const bora = thrown('bora', 18)
    renderDice({ dice: { rolls: [bora], fresh: null } })

    await user.click(within(entryOf('Bora')).getByRole('button', { name: 'Tekrar izle' }))

    expect(await restButton(bora.id)).toBeInTheDocument()
    expectShown('Bora', 23)
  })

  it('shows the result after 10 seconds when the strip never reports rest', () => {
    vi.useFakeTimers()
    const bora = thrown('bora', 18)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })
    expectHidden('Bora')

    act(() => {
      vi.advanceTimersByTime(SETTLE_MAX_MS - 1)
    })
    expectHidden('Bora')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expectShown('Bora', 23)
  })

  it('hides nothing with reduced motion, where the dice show at rest at once', async () => {
    stubMedia('(prefers-reduced-motion: reduce)')
    const bora = thrown('bora', 18)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })

    expect(await screen.findByRole('button', { name: `${bora.id} at rest` })).toBeInTheDocument()
    expectShown('Bora', 23)
  })

  it('hides nothing for a roll without motion, which shows flat at once', () => {
    const flat = testRoll({ by: 'bora', dice: [['d20', 18]], content: { modifier: 5 } })
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [flat], fresh: flat })
    expectShown('Bora', 23)
  })

  it('hides nothing with "Zarları 3D göster" off, where the dice show flat at once', () => {
    window.localStorage.setItem('lcm.dice.3d', '0')
    const bora = thrown('bora', 18)
    const view = renderDice({ dice: { rolls: [], fresh: null } })
    view.setDice({ rolls: [bora], fresh: bora })

    expect(screen.queryByRole('button', { name: `${bora.id} plays` })).not.toBeInTheDocument()
    expect(within(screen.getByTestId('dice-strip')).getByTestId('flat-dice')).toBeInTheDocument()
    expectShown('Bora', 23)
  })
})

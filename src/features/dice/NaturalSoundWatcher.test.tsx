import { beforeEach, describe, expect, it, vi } from 'vitest'

import { testRoll } from '@/test/diceFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { NATURAL_SOUND_KEY, resetDeviceSettingsMemory, SHOW_ROLLS_KEY } from './deviceSettings'
import { playNaturalOnce } from './sound/natural'

vi.mock('./sound/natural', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  playNaturalOnce: vi.fn(() => true),
  playNatural: vi.fn(),
}))

const PROFILES = ready([testProfile(), testProfile({ id: 'bora', displayName: 'Bora' })])

function render(path: string, options: RenderAppOptions = {}) {
  return renderApp({ path, users: { profiles: PROFILES }, ...options })
}

const natural1 = () => testRoll({ by: 'bora', dice: [['d20', 1]] })

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
  vi.mocked(playNaturalOnce).mockClear()
})

describe('the natural sound on another screen', () => {
  it('plays when a fresh Nat 1 arrives on the hand screen, once', () => {
    const view = render('/rules', { dice: { rolls: [] } })
    const roll = natural1()
    view.setDice({ rolls: [roll], fresh: roll })
    view.setDice({ rolls: [roll], fresh: roll })
    expect(playNaturalOnce).toHaveBeenCalledTimes(1)
    expect(playNaturalOnce).toHaveBeenCalledWith(roll, true)
  })

  it('plays when "Atışları göster" is off and no card opens', () => {
    window.localStorage.setItem(SHOW_ROLLS_KEY, '0')
    const view = render('/rules', { dice: { rolls: [] } })
    const roll = natural1()
    view.setDice({ rolls: [roll], fresh: roll })
    expect(playNaturalOnce).toHaveBeenCalledWith(roll, true)
  })

  it('passes the device setting along, so a device that turned it off stays silent', () => {
    window.localStorage.setItem(NATURAL_SOUND_KEY, '0')
    const view = render('/rules', { dice: { rolls: [] } })
    const roll = natural1()
    view.setDice({ rolls: [roll], fresh: roll })
    expect(playNaturalOnce).toHaveBeenCalledWith(roll, false)
  })

  it('leaves the Zarlar screen to play it itself, so it plays once there', () => {
    const view = render('/dice', { dice: { rolls: [] } })
    const roll = natural1()
    view.setDice({ rolls: [roll], fresh: roll })
    // The screen shows this roll flat (jsdom has no WebGL), so its result shows at once and the screen plays it.
    expect(playNaturalOnce).toHaveBeenCalledTimes(1)
  })

  it('does not play the roll that was fresh before it mounted', () => {
    const roll = natural1()
    render('/rules', { dice: { rolls: [roll], fresh: roll } })
    expect(playNaturalOnce).not.toHaveBeenCalled()
  })
})

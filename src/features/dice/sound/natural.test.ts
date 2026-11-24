import { beforeEach, describe, expect, it, vi } from 'vitest'

import { testHiddenRoll, testRoll } from '@/test/diceFixtures'

import { loadSound, playBuffer } from './audio'
import { playNatural, playNaturalOnce, prepareNaturalSounds, resetNaturalSounds } from './natural'

vi.mock('./audio', () => ({
  loadSound: vi.fn((url: string) => Promise.resolve({ url } as unknown as AudioBuffer)),
  playBuffer: vi.fn(),
  unlockAudio: vi.fn(),
}))

/** The files the sounds that played came from. */
async function played(): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  return vi
    .mocked(playBuffer)
    .mock.calls.map(([buffer]) => (buffer as unknown as { url: string }).url)
}

beforeEach(() => {
  resetNaturalSounds()
  vi.mocked(playBuffer).mockClear()
  vi.mocked(loadSound).mockClear()
})

describe('the natural sounds', () => {
  it('plays the Nat 20 sound for a kept 20, and the Nat 1 sound for a kept 1', async () => {
    expect(playNaturalOnce(testRoll({ dice: [['d20', 20]] }), true)).toBe(true)
    expect(playNaturalOnce(testRoll({ dice: [['d20', 1]] }), true)).toBe(true)
    const files = await played()
    expect(files).toHaveLength(2)
    expect(files[0]).toMatch(/nat20\.m4a/)
    expect(files[1]).toMatch(/nat1\.m4a/)
  })

  it('plays nothing for a roll without a natural mark', async () => {
    expect(playNaturalOnce(testRoll({ dice: [['d20', 17]] }), true)).toBe(false)
    expect(playNaturalOnce(testRoll({ dice: [['d6', 1]] }), true)).toBe(false)
    expect(
      playNaturalOnce(
        testRoll({
          dice: [
            ['d20', 20],
            ['d20', 3],
          ],
          content: { mode: 'disadvantage' },
        }),
        true,
      ),
    ).toBe(false)
    expect(await played()).toEqual([])
  })

  it("plays nothing for a hidden roll on a player's device", async () => {
    expect(playNaturalOnce(testHiddenRoll(), true)).toBe(false)
    expect(await played()).toEqual([])
  })

  it('plays nothing when the device turned the natural sounds off', async () => {
    expect(playNaturalOnce(testRoll({ dice: [['d20', 20]] }), false)).toBe(false)
    expect(await played()).toEqual([])
  })

  it('plays a fresh roll once, and again only when asked to replay it', async () => {
    const roll = testRoll({ dice: [['d20', 20]] })
    playNaturalOnce(roll, true)
    expect(playNaturalOnce(roll, true)).toBe(false)
    playNatural('natural20')
    expect(await played()).toHaveLength(2)
  })

  it('loads both sounds ahead', () => {
    prepareNaturalSounds()
    expect(vi.mocked(loadSound)).toHaveBeenCalledTimes(2)
  })
})

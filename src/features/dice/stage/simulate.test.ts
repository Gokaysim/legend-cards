// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'

import type { DieType } from '../formula'
import { GOLDEN_CASES } from './goldenCases'
import { FACES } from './owlbear/faces'
import { makeThrows } from './owlbear/throws'
import { FRAME_STRIDE, faceUp, loadPhysics, simulateThrow } from './simulate'
import { GOLDEN_RESULTS } from './simulate.golden'
import { seededUnit } from './testRandom'

beforeAll(async () => {
  await loadPhysics()
})

describe('simulateThrow', () => {
  it('gives identical frames, rests, values and impacts for the same throws', () => {
    const dice: DieType[] = [
      'd20',
      'd12',
      'd10',
      'd8',
      'd6',
      'd4',
      'd100',
      'd10',
      'd6',
      'd6',
      'd6',
      'd6',
    ]
    const throws = makeThrows(dice, seededUnit(42))
    const first = simulateThrow(dice, 'galaxy', throws)
    const second = simulateThrow(dice, 'galaxy', throws)
    expect(second.frameCount).toBe(first.frameCount)
    expect(Array.from(second.frames)).toEqual(Array.from(first.frames))
    expect(second.rests).toEqual(first.rests)
    expect(second.values).toEqual(first.values)
    expect(second.impacts).toEqual(first.impacts)
  })

  it('records a frame per two steps, starting at the throw, and stops within five seconds', () => {
    const dice: DieType[] = ['d6', 'd6']
    const throws = makeThrows(dice, seededUnit(1))
    const result = simulateThrow(dice, 'galaxy', throws)
    expect(result.frames).toHaveLength(result.frameCount * dice.length * FRAME_STRIDE)
    expect(result.frameCount).toBeLessThanOrEqual(5 * 60 + 1)
    expect(Array.from(result.frames.slice(0, 3))).toEqual([
      throws[0]?.position.x,
      throws[0]?.position.y,
      throws[0]?.position.z,
    ])
  })

  it('ends every die at rest in the tray, on a face of its die', () => {
    const dice: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'd10']
    const result = simulateThrow(dice, 'iron', makeThrows(dice, seededUnit(9)))
    result.rests.forEach((rest, index) => {
      expect(Math.abs(rest.position.x)).toBeLessThan(0.46)
      expect(Math.abs(rest.position.z)).toBeLessThan(0.96)
      expect(rest.position.y).toBeGreaterThan(0)
      expect(rest.position.y).toBeLessThan(0.3)
      const faces = FACES[dice[index] as DieType].map((face) => face.value)
      expect(faces).toContain(result.values[index])
    })
  })

  it('brings sixty d6 to rest inside the tray within five seconds, each on a face', () => {
    const dice: DieType[] = Array.from({ length: 60 }, () => 'd6')
    const result = simulateThrow(dice, 'galaxy', makeThrows(dice, seededUnit(60)))
    expect(result.frameCount).toBeLessThanOrEqual(5 * 60 + 1)
    expect(result.rests).toHaveLength(60)
    result.rests.forEach((rest, index) => {
      expect(Math.abs(rest.position.x)).toBeLessThan(0.46)
      expect(Math.abs(rest.position.z)).toBeLessThan(0.96)
      expect(rest.position.y).toBeGreaterThan(0)
      expect([1, 2, 3, 4, 5, 6]).toContain(result.values[index])
    })
  })

  it('records impacts at frames of the throw', () => {
    const dice: DieType[] = ['d6', 'd6', 'd6']
    const result = simulateThrow(dice, 'galaxy', makeThrows(dice, seededUnit(3)))
    expect(result.impacts.length).toBeGreaterThan(0)
    for (const impact of result.impacts) {
      expect(impact.frame).toBeLessThan(result.frameCount)
      expect(impact.die).toBeLessThan(dice.length)
      expect(impact.strength).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('faceUp', () => {
  it('reads the face whose locator points up', () => {
    const still = { x: 0, y: 0, z: 0, w: 1 }
    expect(faceUp('d6', still)).toBe(6)
    expect(faceUp('d4', still)).toBe(4)
    expect(faceUp('d12', still)).toBe(12)
    // A half turn about x puts the d6's 1 on top.
    expect(faceUp('d6', { x: 1, y: 0, z: 0, w: 0 })).toBe(1)
  })
})

describe('golden throws', () => {
  // Fixed throws must keep their outcome: this guards against a Rapier upgrade or a change to the physics data that
  // would make old records play differently.
  it.each(GOLDEN_CASES.map((golden, index) => [golden.seed, golden, index] as const))(
    'seed %i lands as recorded',
    (_seed, { seed, dice, style }, index) => {
      const result = simulateThrow(dice, style, makeThrows(dice, seededUnit(seed)))
      const expected = GOLDEN_RESULTS[index]
      expect({
        seed,
        frameCount: result.frameCount,
        values: result.values,
        rests: result.rests,
      }).toEqual(expected)
    },
  )
})

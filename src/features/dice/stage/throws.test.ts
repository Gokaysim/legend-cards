import { describe, expect, it } from 'vitest'

import { THROW_RANGES, makeThrows } from './owlbear/throws'
import { seededUnit } from './testRandom'

describe('makeThrows', () => {
  it('makes one throw per die, inside the ranges', () => {
    const throws = makeThrows(Array.from({ length: 12 }), Math.random)
    expect(throws).toHaveLength(12)
    for (const { position, rotation, linearVelocity, angularVelocity } of throws) {
      expect(position.x).toBeGreaterThanOrEqual(THROW_RANGES.x[0])
      expect(position.x).toBeLessThanOrEqual(THROW_RANGES.x[1])
      expect(position.y).toBeGreaterThanOrEqual(THROW_RANGES.y[0])
      expect(position.y).toBeLessThanOrEqual(THROW_RANGES.y[1])
      expect(position.z).toBeGreaterThanOrEqual(THROW_RANGES.z[0])
      expect(position.z).toBeLessThanOrEqual(THROW_RANGES.z[1])
      expect(Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w)).toBeCloseTo(1, 5)
      expect(linearVelocity.y).toBe(0)
      const launch = Math.hypot(linearVelocity.x, linearVelocity.z)
      expect(launch).toBeGreaterThanOrEqual(THROW_RANGES.launch[0] - 1e-6)
      expect(launch).toBeLessThanOrEqual(THROW_RANGES.launch[1] + 1e-6)
      // The launch points towards the tray's centre.
      expect(linearVelocity.x * position.x + linearVelocity.z * position.z).toBeLessThanOrEqual(0)
      // The range is the spin's speed; its direction is random.
      for (const spin of [angularVelocity.x, angularVelocity.y, angularVelocity.z]) {
        expect(Math.abs(spin)).toBeGreaterThanOrEqual(THROW_RANGES.spin[0])
        expect(Math.abs(spin)).toBeLessThanOrEqual(THROW_RANGES.spin[1])
      }
    }
  })

  it('spins the dice either way about every axis', () => {
    const throws = makeThrows(Array.from({ length: 40 }), seededUnit(11))
    for (const axis of ['x', 'y', 'z'] as const) {
      const spins = throws.map((dieThrow) => dieThrow.angularVelocity[axis])
      expect(spins.some((spin) => spin > 0)).toBe(true)
      expect(spins.some((spin) => spin < 0)).toBe(true)
    }
  })

  it('rounds every number to 32 bits, as the record stores it', () => {
    for (const dieThrow of makeThrows(Array.from({ length: 4 }), Math.random)) {
      const numbers = Object.values(dieThrow).flatMap((part: Record<string, number>) =>
        Object.values(part),
      )
      for (const value of numbers) expect(Math.fround(value)).toBe(value)
    }
  })

  it('gives a fixed throw from an injected source', () => {
    expect(makeThrows(['d6', 'd6'], seededUnit(7))).toEqual(makeThrows(['d6', 'd6'], seededUnit(7)))
    expect(makeThrows(['d6'], seededUnit(7))).not.toEqual(makeThrows(['d6'], seededUnit(8)))
  })
})

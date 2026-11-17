import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import {
  type DieMotion,
  DICE_STYLES,
  MOTION_MAX,
  decodeMotion,
  diceRollSchema,
  dmRollSchema,
  encodeMotion,
} from './schema'

function motionOf(seed: number): DieMotion {
  const f = (n: number) => Math.fround(seed + n / 10)
  return {
    throw: {
      position: { x: f(1), y: f(2), z: f(3) },
      rotation: { x: f(4), y: f(5), z: f(6), w: f(7) },
      linearVelocity: { x: f(8), y: f(9), z: f(10) },
      angularVelocity: { x: f(11), y: f(12), z: f(13) },
    },
    rest: {
      position: { x: f(14), y: f(15), z: f(16) },
      rotation: { x: f(17), y: f(18), z: f(19), w: f(20) },
    },
  }
}

const twoD6 = [motionOf(1), motionOf(-2)]

const stored = {
  by: 'ayla',
  at: Timestamp.fromMillis(1000),
  hidden: false,
  style: 'walnut',
  mode: 'normal',
  modifier: 3,
  note: 'Ateş topu',
  dice: [
    { t: 'd6', v: 4 },
    { t: 'd6', v: 2 },
  ],
  motion: encodeMotion(twoD6),
  sim: 1,
}

describe('motion', () => {
  it('round-trips through base64 of 32-bit floats', () => {
    expect(decodeMotion(encodeMotion(twoD6), 2)).toEqual(twoD6)
  })

  it('fits sixty dice in the rules limit', () => {
    const sixty = Array.from({ length: 60 }, (_, index) => motionOf(index))
    expect(encodeMotion(sixty).length).toBeLessThanOrEqual(MOTION_MAX)
    expect(encodeMotion(sixty)).toHaveLength(6400)
    expect(decodeMotion(encodeMotion(sixty), 60)).toEqual(sixty)
  })

  it('decodes garbage, a wrong length and non-finite numbers to null', () => {
    expect(decodeMotion('***not base64***', 2)).toBeNull()
    expect(decodeMotion(encodeMotion(twoD6), 3)).toBeNull()
    expect(decodeMotion('', 1)).toBeNull()
    const broken = motionOf(0)
    broken.rest.position.x = Number.NaN
    expect(decodeMotion(encodeMotion([broken]), 1)).toBeNull()
  })
})

describe('roll records', () => {
  it('reads a public roll with its content and motion', () => {
    const roll = diceRollSchema.parse(stored)
    expect(roll).toEqual({
      by: 'ayla',
      at: stored.at,
      hidden: false,
      content: {
        style: 'walnut',
        mode: 'normal',
        modifier: 3,
        modifierSum: null,
        note: 'Ateş topu',
        dice: stored.dice,
        motion: twoD6,
      },
    })
  })

  it('keeps a roll whose motion is garbage, without its motion', () => {
    const roll = diceRollSchema.parse({ ...stored, motion: 'garbage!' })
    expect(roll.content?.motion).toBeNull()
    expect(roll.content?.dice).toEqual(stored.dice)
  })

  it('keeps a roll whose motion is not even a string, or has an unknown format', () => {
    expect(diceRollSchema.parse({ ...stored, motion: 42 }).content?.motion).toBeNull()
    expect(diceRollSchema.parse({ ...stored, sim: 0 }).content?.motion).toBeNull()
    expect(diceRollSchema.parse({ ...stored, sim: 2 }).content?.motion).toBeNull()
  })

  it('reads the fixed number as written when it adds up, and drops it otherwise', () => {
    const sum = { ...stored, modifier: 11 }
    expect(diceRollSchema.parse({ ...sum, modifierSum: '5+10-4' }).content?.modifierSum).toBe(
      '5+10-4',
    )
    expect(diceRollSchema.parse({ ...sum, modifierSum: '5+10-3' }).content?.modifierSum).toBeNull()
    expect(diceRollSchema.parse({ ...sum, modifierSum: '5+*6' }).content?.modifierSum).toBeNull()
    expect(diceRollSchema.parse({ ...sum, modifierSum: 42 }).content?.modifierSum).toBeNull()
    expect(diceRollSchema.parse(sum).content?.modifierSum).toBeNull()
    const dm = dmRollSchema.parse({ ...sum, by: 'dm', hidden: true, modifierSum: '5+10-4' })
    expect(dm.content?.modifierSum).toBe('5+10-4')
  })

  it('reads a pending roll without its server time', () => {
    expect(diceRollSchema.parse({ ...stored, at: null }).at).toBeNull()
  })

  it("reads a hidden roll's public record without content", () => {
    expect(diceRollSchema.parse({ by: 'dm', at: stored.at, hidden: true })).toEqual({
      by: 'dm',
      at: stored.at,
      hidden: true,
      content: null,
    })
  })

  it("reads a hidden roll's DM record with its content", () => {
    const roll = dmRollSchema.parse({ ...stored, by: 'dm', hidden: true })
    expect(roll.hidden).toBe(true)
    expect(roll.content?.dice).toEqual(stored.dice)
  })

  it('reads a roll of sixty dice with its motion, and refuses sixty-one', () => {
    const sixty = Array.from({ length: 60 }, (_, index) => ({ t: 'd6', v: (index % 6) + 1 }))
    const motion = encodeMotion(Array.from({ length: 60 }, (_, index) => motionOf(index)))
    const roll = diceRollSchema.parse({ ...stored, dice: sixty, motion })
    expect(roll.content?.dice).toHaveLength(60)
    expect(roll.content?.motion).toHaveLength(60)
    const sixtyOne = [...sixty, { t: 'd6', v: 1 }]
    expect(diceRollSchema.safeParse({ ...stored, dice: sixtyOne }).success).toBe(false)
  })

  it('refuses a roll with a bad style, mode, die, modifier or note', () => {
    expect(diceRollSchema.safeParse({ ...stored, style: 'gold' }).success).toBe(false)
    expect(diceRollSchema.safeParse({ ...stored, mode: 'lucky' }).success).toBe(false)
    expect(diceRollSchema.safeParse({ ...stored, dice: [{ t: 'd7', v: 1 }] }).success).toBe(false)
    expect(diceRollSchema.safeParse({ ...stored, dice: [] }).success).toBe(false)
    expect(diceRollSchema.safeParse({ ...stored, modifier: 100 }).success).toBe(false)
    expect(diceRollSchema.safeParse({ ...stored, note: 'x'.repeat(81) }).success).toBe(false)
  })

  it('knows the eight styles, Galaxy first', () => {
    expect(DICE_STYLES).toEqual([
      'galaxy',
      'gemstone',
      'glass',
      'iron',
      'nebula',
      'sunrise',
      'sunset',
      'walnut',
    ])
  })
})

/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/colliders/*.tsx, src/dice/PhysicsDice.tsx,
 * src/dice/DiceRoll.tsx and src/helpers/getDieDensity.ts.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: the collider hull points, the tray's walls and the physical constants are plain
 * data instead of React Three Rapier components, so a pure simulation can build its own Rapier world from them.
 */

import type { DieType } from '../../formula'
import type { DiceStyle } from '../../schema'

/** The simulation's fixed step: 120 steps per second, as Owlbear's `<Physics timeStep={1 / 120}>`. */
export const STEP_SECONDS = 1 / 120

/** Rapier's default gravity, which Owlbear's `<Physics>` keeps. */
export const GRAVITY = -9.81

/** Dice are about ten times their real size, so they fall with twice the gravity. */
export const DIE_GRAVITY_SCALE = 2

export const DIE_FRICTION = 0.1

/** A die counts as at rest below this linear plus angular speed, inside the tray (`y` below `ROLL_MAX_Y`). */
export const ROLL_FINISHED_SPEED = 0.005
export const ROLL_MAX_Y = 1.5

/** A roll is stopped after five seconds, whatever its dice do. */
export const MAX_ROLL_SECONDS = 5

/** The heavier materials sink faster and bounce less. */
export function dieDensity(style: DiceStyle): number {
  if (style === 'iron') return 2
  if (style === 'walnut' || style === 'glass') return 1.5
  return 1
}

/** Hull points of each die's collider, in metres (Owlbear's points divided by ten). A d100's tens die uses the d10's. */
const D4 = [
  0.0, -0.635828, -1.269768, 0.0, 1.159624, 0.0, 1.099651, -0.635829, 0.634884, -1.099651,
  -0.635829, 0.634884,
]
const D6 = [
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, -0.8, -0.8, 0.8, -0.8, 0.8, -0.8, 0.8, 0.8, 0.8, 0.8,
  0.8, -0.8, -0.8, 0.8, 0.8, -0.8,
]
const D8 = [
  -1.371878, 0.0, 0.0, 0.0, -1.371878, 0.0, 0.0, 1.371878, 0.0, 0.0, 0.0, 1.371878, 1.371878, 0.0,
  0.0, 0.0, 0.0, -1.371878,
]
const D10 = [
  0.0, -1.172751, -0.0, 0.0, 1.172751, 0.0, 1.122302, -0.123811, 0.364658, 0.693621, 0.123811,
  0.954687, 0.0, -0.123811, 1.180058, 0.69362, -0.123811, -0.954687, 1.122302, 0.123811, -0.364658,
  0.0, 0.123811, -1.180058, -0.693621, -0.123811, -0.954687, -1.122301, -0.123811, 0.364658,
  -1.122301, 0.123811, -0.364658, -0.693621, 0.12381, 0.954687,
]
const D12 = [
  -0.585502, -0.947024, 0.425393, -0.585502, -0.947024, -0.425393, 0.361605, -0.223492, 1.113503,
  0.223387, -0.947218, 0.688111, -0.947053, -0.223492, 0.688291, 0.223745, -0.947218, -0.687995,
  -0.947265, -0.223492, -0.687999, 1.170755, -0.223493, 0.000186, 0.723468, -0.947218, 0.00019,
  0.361605, -0.223492, -1.113503, -0.361954, 0.223492, 1.113389, -0.361605, 0.223492, -1.113503,
  -1.170755, 0.223493, 0.000186, -0.723468, 0.947218, 0.00019, -0.223745, 0.947218, -0.687995,
  0.585405, 0.947218, -0.425095, 0.947053, 0.223492, 0.688291, 0.947053, 0.223492, -0.688291,
  -0.223646, 0.94702, 0.6883, 0.585502, 0.947024, 0.425393,
]
const D20 = [
  -1.355243, -0.262864, 0.0, -0.415876, -1.09821, 0.725756, -0.678737, 0.257012, 1.174309,
  -0.841197, 1.094606, 0.0, -0.678737, 0.257012, -1.174309, -0.415876, -1.09821, -0.725756,
  0.678737, -0.257012, 1.174309, 0.415876, 1.09821, 0.725756, 0.415876, 1.09821, -0.725756,
  0.678737, -0.257012, -1.174309, 0.841197, -1.094606, 0.0, 1.355243, 0.262864, 0.0,
]

const HULLS: Record<DieType, readonly number[]> = {
  d4: D4,
  d6: D6,
  d8: D8,
  d10: D10,
  d12: D12,
  d20: D20,
  d100: D10,
}

export function hullPoints(type: DieType): Float32Array {
  return Float32Array.from(HULLS[type], (n) => n / 10)
}

/**
 * The tray's colliders: very large, thick boxes so a fast die cannot pass through. Half extents and centres in
 * metres. The floor's top sits at y = 0.005, the walls' inner faces at x = ±0.46 and z = ±0.96, the roof at y = 1.5.
 */
const WALL_THICKNESS = 50
const WALL_SIZE = 100
const FLOOR_Y = -WALL_THICKNESS + 0.005
const ROOF_Y = WALL_THICKNESS + 1.5
const WALL_X = WALL_THICKNESS + 0.46
const WALL_Z = WALL_THICKNESS + 0.96

export type TrayBox = {
  /** Half extents after the box's rotation, so no rotation is needed. */
  half: readonly [number, number, number]
  centre: readonly [number, number, number]
  friction: number
  restitution: number
  material: 'leather' | 'wood'
}

export const TRAY_BOXES: readonly TrayBox[] = [
  // The floor: a large friction and restitution, as a bouncy leather.
  {
    half: [WALL_SIZE, WALL_THICKNESS, WALL_SIZE],
    centre: [0, FLOOR_Y, 0],
    friction: 10,
    restitution: 0.5,
    material: 'leather',
  },
  // The walls and the roof: a small friction and a high restitution, as wood, so dice rarely rest against a wall.
  // Owlbear rotates each wall a quarter turn; swapping the half extents gives the same box.
  {
    half: [WALL_SIZE, WALL_SIZE, WALL_THICKNESS],
    centre: [0, FLOOR_Y, WALL_Z],
    friction: 1,
    restitution: 0.9,
    material: 'wood',
  },
  {
    half: [WALL_SIZE, WALL_SIZE, WALL_THICKNESS],
    centre: [0, FLOOR_Y, -WALL_Z],
    friction: 1,
    restitution: 0.9,
    material: 'wood',
  },
  {
    half: [WALL_THICKNESS, WALL_SIZE, WALL_SIZE],
    centre: [WALL_X, FLOOR_Y, 0],
    friction: 1,
    restitution: 0.9,
    material: 'wood',
  },
  {
    half: [WALL_THICKNESS, WALL_SIZE, WALL_SIZE],
    centre: [-WALL_X, FLOOR_Y, 0],
    friction: 1,
    restitution: 0.9,
    material: 'wood',
  },
  {
    half: [WALL_SIZE, WALL_THICKNESS, WALL_SIZE],
    centre: [0, ROOF_Y, 0],
    friction: 1,
    restitution: 0.9,
    material: 'wood',
  },
]

/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/helpers/DiceThrower.ts and src/helpers/random.ts.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: the random source is injected (a cryptographic one in the app), and every number is
 * rounded to 32 bits, so the throw the roller simulates is exactly the throw the record stores.
 */

import type { DieThrow, Quaternion, Vector } from '../../schema'

/** Uniform numbers from 0 (included) to 1 (excluded). */
export type UnitSource = () => number

const MIN_X = -0.3
const MAX_X = 0.3
const MIN_Y = 1
const MAX_Y = 1.2
const MIN_Z = -0.8
const MAX_Z = 0.8
const MIN_LAUNCH_VELOCITY = 1
const MAX_LAUNCH_VELOCITY = 2
const MIN_ANGULAR_VELOCITY = 2
const MAX_ANGULAR_VELOCITY = 6
/** Dice start at least this far apart, when 50 tries allow it. */
const MIN_DISTANCE = 0.25
const POSITION_TRIES = 50

export const THROW_RANGES = {
  x: [MIN_X, MAX_X],
  y: [MIN_Y, MAX_Y],
  z: [MIN_Z, MAX_Z],
  launch: [MIN_LAUNCH_VELOCITY, MAX_LAUNCH_VELOCITY],
  spin: [MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY],
} as const

function between(random: UnitSource, min: number, max: number): number {
  return random() * (max - min) + min
}

function randomPosition(random: UnitSource): Vector {
  return {
    x: between(random, MIN_X, MAX_X),
    y: between(random, MIN_Y, MAX_Y),
    z: between(random, MIN_Z, MAX_Z),
  }
}

/** A uniformly random rotation (https://stackoverflow.com/a/56794499). */
function randomRotation(random: UnitSource): Quaternion {
  let x: number, y: number, z: number, u: number, v: number, w: number
  do {
    x = between(random, -1, 1)
    y = between(random, -1, 1)
    z = x * x + y * y
  } while (z > 1)
  do {
    u = between(random, -1, 1)
    v = between(random, -1, 1)
    w = u * u + v * v
  } while (w > 1 || w === 0)
  const s = Math.sqrt((1 - z) / w)
  return { x, y, z: s * u, w: s * v }
}

/** A launch towards the tray's centre, on the horizontal plane, so the dice look thrown rather than dropped. */
function randomLinearVelocity(random: UnitSource, position: Vector): Vector {
  const length = Math.sqrt(position.x * position.x + position.z * position.z)
  if (Number.isNaN(length) || length === 0) return { x: 0, y: 0, z: 0 }
  const speed = between(random, MIN_LAUNCH_VELOCITY, MAX_LAUNCH_VELOCITY)
  return { x: (-position.x / length) * speed, y: 0, z: (-position.z / length) * speed }
}

function randomAngularVelocity(random: UnitSource): Vector {
  return {
    x: between(random, MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
    y: between(random, MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
    z: between(random, MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
  }
}

function isFarEnough(position: Vector, others: readonly DieThrow[]): boolean {
  return others.every(({ position: other }) => {
    const distance = Math.hypot(position.x - other.x, position.y - other.y, position.z - other.z)
    return distance >= MIN_DISTANCE
  })
}

const f32 = Math.fround

function rounded(value: DieThrow): DieThrow {
  const { position: p, rotation: r, linearVelocity: l, angularVelocity: a } = value
  return {
    position: { x: f32(p.x), y: f32(p.y), z: f32(p.z) },
    rotation: { x: f32(r.x), y: f32(r.y), z: f32(r.z), w: f32(r.w) },
    linearVelocity: { x: f32(l.x), y: f32(l.y), z: f32(l.z) },
    angularVelocity: { x: f32(a.x), y: f32(a.y), z: f32(a.z) },
  }
}

/** One throw per die, in the dice's order, each starting apart from the ones before it. */
export function makeThrows(dice: readonly unknown[], random: UnitSource): DieThrow[] {
  const throws: DieThrow[] = []
  for (let index = 0; index < dice.length; index += 1) {
    let position = randomPosition(random)
    for (
      let attempt = 1;
      attempt < POSITION_TRIES && !isFarEnough(position, throws);
      attempt += 1
    ) {
      position = randomPosition(random)
    }
    const rotation = randomRotation(random)
    const linearVelocity = randomLinearVelocity(random, position)
    const angularVelocity = randomAngularVelocity(random)
    throws.push(rounded({ position, rotation, linearVelocity, angularVelocity }))
  }
  return throws
}

import RAPIER from '@dimforge/rapier3d-deterministic-compat'

import type { DieType } from '../formula'
import type { DiceStyle, DieThrow, Quaternion, Transform, Vector } from '../schema'
import { FACES } from './owlbear/faces'
import {
  DIE_FRICTION,
  DIE_GRAVITY_SCALE,
  GRAVITY,
  MAX_ROLL_SECONDS,
  ROLL_FINISHED_SPEED,
  ROLL_MAX_Y,
  STEP_SECONDS,
  TRAY_BOXES,
  dieDensity,
  hullPoints,
} from './owlbear/physics'

/** A die striking the tray or another die, for the sounds. */
export type Impact = { frame: number; die: number; strength: number }

/** Floats per die in a frame: the position (3) and the rotation (4). */
export const FRAME_STRIDE = 7

/** Frames per second of the result: one frame every two steps. */
export const FRAMES_PER_SECOND = 60
const STEPS_PER_FRAME = 2
const MAX_STEPS = Math.round(MAX_ROLL_SECONDS / STEP_SECONDS)

/** What a throw does: the frames to play, where each die comes to rest, its face, and its impacts. */
export type Simulation = {
  /** `frameCount` frames of every die's transform, `FRAME_STRIDE` floats per die. Frame 0 is the throw's start. */
  frames: Float32Array
  frameCount: number
  rests: Transform[]
  values: number[]
  impacts: Impact[]
}

let ready: Promise<void> | null = null

/** Loads Rapier's WebAssembly once. Every simulation waits for it. */
export function loadPhysics(): Promise<void> {
  ready ??= RAPIER.init()
  return ready
}

/** `vector` turned by the unit quaternion `rotation`. */
export function rotate(vector: Vector, rotation: Quaternion): Vector {
  const { x, y, z, w } = rotation
  const tx = 2 * (y * vector.z - z * vector.y)
  const ty = 2 * (z * vector.x - x * vector.z)
  const tz = 2 * (x * vector.y - y * vector.x)
  return {
    x: vector.x + w * tx + (y * tz - z * ty),
    y: vector.y + w * ty + (z * tx - x * tz),
    z: vector.z + w * tz + (x * ty - y * tx),
  }
}

/** The face that points most nearly up when the die is turned by `rotation`. */
export function faceUp(type: DieType, rotation: Quaternion): number {
  let best = -Infinity
  let value = 0
  for (const face of FACES[type]) {
    const up = rotate(face, rotation).y
    if (up > best) {
      best = up
      value = face.value
    }
  }
  return value
}

function speedOf(body: RAPIER.RigidBody): number {
  const linear = body.linvel()
  const angular = body.angvel()
  return Math.hypot(linear.x, linear.y, linear.z) + Math.hypot(angular.x, angular.y, angular.z)
}

function transformOf(body: RAPIER.RigidBody): Transform {
  const position = body.translation()
  const rotation = body.rotation()
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  }
}

/**
 * Throws the dice in a fresh Rapier world with a fixed step, until every die rests or five seconds pass (design D2).
 * The same dice, style and throws give the same frames, rests and values on every device. Call `loadPhysics()` first.
 */
export function simulateThrow(
  dice: readonly DieType[],
  style: DiceStyle,
  throws: readonly DieThrow[],
): Simulation {
  const world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 })
  world.timestep = STEP_SECONDS
  const events = new RAPIER.EventQueue(true)
  try {
    for (const box of TRAY_BOXES) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
      const collider = RAPIER.ColliderDesc.cuboid(...box.half)
        .setTranslation(...box.centre)
        .setFriction(box.friction)
        .setRestitution(box.restitution)
      world.createCollider(collider, body)
    }

    const density = dieDensity(style)
    const bodies = dice.map((type, index) => {
      const dieThrow = throws[index]
      if (!dieThrow) throw new Error(`No throw for die ${index}`)
      const { position: p, rotation, linearVelocity: l, angularVelocity } = dieThrow
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(p.x, p.y, p.z)
          .setRotation(rotation)
          .setLinvel(l.x, l.y, l.z)
          .setAngvel(angularVelocity)
          .setGravityScale(DIE_GRAVITY_SCALE),
      )
      const hull = RAPIER.ColliderDesc.convexHull(hullPoints(type))
      if (!hull) throw new Error(`No hull for ${type}`)
      const collider = world.createCollider(
        hull
          .setDensity(density)
          .setFriction(DIE_FRICTION)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
      )
      return { body, collider: collider.handle }
    })
    const dieOfCollider = new Map(bodies.map(({ collider }, index) => [collider, index]))

    const maxFrames = MAX_STEPS / STEPS_PER_FRAME + 1
    const frames = new Float32Array(maxFrames * dice.length * FRAME_STRIDE)
    let frameCount = 0
    const writeFrame = () => {
      let offset = frameCount * dice.length * FRAME_STRIDE
      for (const { body } of bodies) {
        const p = body.translation()
        const r = body.rotation()
        frames.set([p.x, p.y, p.z, r.x, r.y, r.z, r.w], offset)
        offset += FRAME_STRIDE
      }
      frameCount += 1
    }

    const rests: (Transform | null)[] = dice.map(() => null)
    const impacts: Impact[] = []
    const settle = (index: number) => {
      const entry = bodies[index]
      if (!entry || rests[index]) return
      const { body } = entry
      rests[index] = transformOf(body)
      // Lock the die where it lies, so later collisions cannot move it, as Owlbear does.
      body.setEnabledRotations(false, false, false, false)
      body.setAngvel({ x: 0, y: 0, z: 0 }, false)
      body.setEnabledTranslations(false, false, false, false)
      body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    }

    writeFrame()
    for (let step = 1; step <= MAX_STEPS; step += 1) {
      world.step(events)
      events.drainCollisionEvents((first, second, started) => {
        if (!started) return
        for (const handle of [first, second]) {
          const die = dieOfCollider.get(handle)
          const entry = die === undefined ? undefined : bodies[die]
          if (die === undefined || !entry || rests[die]) continue
          const v = entry.body.linvel()
          impacts.push({ frame: frameCount, die, strength: Math.hypot(v.x, v.y, v.z) })
        }
      })
      if (step % STEPS_PER_FRAME !== 0) continue
      bodies.forEach(({ body }, index) => {
        if (
          !rests[index] &&
          speedOf(body) < ROLL_FINISHED_SPEED &&
          body.translation().y < ROLL_MAX_Y
        ) {
          settle(index)
        }
      })
      writeFrame()
      if (rests.every(Boolean)) break
    }
    bodies.forEach((_, index) => settle(index))

    const finalRests = rests.map((rest) => rest as Transform)
    return {
      frames: frames.slice(0, frameCount * dice.length * FRAME_STRIDE),
      frameCount,
      rests: finalRests,
      values: finalRests.map((rest, index) => faceUp(dice[index] as DieType, rest.rotation)),
      impacts,
    }
  } finally {
    events.free()
    world.free()
  }
}

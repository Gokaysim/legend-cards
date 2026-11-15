import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

import {
  DIE_TYPES,
  MAX_DICE,
  MODIFIER_MAX,
  MODIFIER_MIN,
  NOTE_MAX,
  ROLL_MODES,
  type RollMode,
  type RolledDie,
} from './formula'

/**
 * The eight dice styles (spec: dice-rolls, "Dice styles"), in the order "Zar stilin" shows them. A user who never
 * chose has Galaxy. Keep in step with `firestore.rules` (DICE_STYLES).
 */
export const DICE_STYLES = [
  'galaxy',
  'gemstone',
  'glass',
  'iron',
  'nebula',
  'sunrise',
  'sunset',
  'walnut',
] as const
export type DiceStyle = (typeof DICE_STYLES)[number]
export const DEFAULT_DICE_STYLE: DiceStyle = 'galaxy'

export const DICE_STYLE_LABELS: Record<DiceStyle, string> = {
  galaxy: 'Galaxy',
  gemstone: 'Gemstone',
  glass: 'Glass',
  iron: 'Iron',
  nebula: 'Nebula',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  walnut: 'Walnut',
}

export type Vector = { x: number; y: number; z: number }
export type Quaternion = { x: number; y: number; z: number; w: number }

/** How one die leaves the hand. */
export type DieThrow = {
  position: Vector
  rotation: Quaternion
  linearVelocity: Vector
  angularVelocity: Vector
}

/** A die's place: where it is and how it is turned. */
export type Transform = { position: Vector; rotation: Quaternion }

/** One die's motion in a record: its throw and where it came to rest. */
export type DieMotion = { throw: DieThrow; rest: Transform }

/**
 * The motion formats (design D4). 1: each die's throw and rest, which every device simulates again. 0: no motion,
 * when the roller's device could not load the physics; the dice then show flat.
 */
export const SIM_THROWS_AND_RESTS = 1
export const SIM_NONE = 0

/** Floats per die in `motion`: the throw (13) and the rest (7). */
export const MOTION_FLOATS = 20

/** The longest `motion`: 12 dice of 20 32-bit floats, in base64, with room to spare. Keep in step with the rules. */
export const MOTION_MAX = 1400

function floatsOf(motion: DieMotion): number[] {
  const { throw: t, rest } = motion
  return [
    t.position.x,
    t.position.y,
    t.position.z,
    t.rotation.x,
    t.rotation.y,
    t.rotation.z,
    t.rotation.w,
    t.linearVelocity.x,
    t.linearVelocity.y,
    t.linearVelocity.z,
    t.angularVelocity.x,
    t.angularVelocity.y,
    t.angularVelocity.z,
    rest.position.x,
    rest.position.y,
    rest.position.z,
    rest.rotation.x,
    rest.rotation.y,
    rest.rotation.z,
    rest.rotation.w,
  ]
}

/** The dice's motion as base64 of little-endian 32-bit floats, 20 per die. */
export function encodeMotion(motion: readonly DieMotion[]): string {
  const view = new DataView(new ArrayBuffer(motion.length * MOTION_FLOATS * 4))
  motion.flatMap(floatsOf).forEach((value, index) => view.setFloat32(index * 4, value, true))
  let binary = ''
  for (let index = 0; index < view.byteLength; index += 1)
    binary += String.fromCharCode(view.getUint8(index))
  return btoa(binary)
}

/**
 * The dice's motion from `encodeMotion`, or `null` when the text is not base64, does not hold `count` dice, or holds a
 * number that is not finite. A bad blob only costs its roll the 3D (design D4).
 */
export function decodeMotion(text: string, count: number): DieMotion[] | null {
  let binary: string
  try {
    binary = atob(text)
  } catch {
    return null
  }
  if (count < 1 || binary.length !== count * MOTION_FLOATS * 4) return null
  const view = new DataView(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1)
    view.setUint8(index, binary.charCodeAt(index))
  const floats = Array.from({ length: count * MOTION_FLOATS }, (_, index) =>
    view.getFloat32(index * 4, true),
  )
  if (!floats.every(Number.isFinite)) return null
  return Array.from({ length: count }, (_, die) => {
    const [px, py, pz, rx, ry, rz, rw, lx, ly, lz, ax, ay, az, sx, sy, sz, qx, qy, qz, qw] =
      floats.slice(die * MOTION_FLOATS, (die + 1) * MOTION_FLOATS) as number[] & { length: 20 }
    return {
      throw: {
        position: { x: px, y: py, z: pz },
        rotation: { x: rx, y: ry, z: rz, w: rw },
        linearVelocity: { x: lx, y: ly, z: lz },
        angularVelocity: { x: ax, y: ay, z: az },
      },
      rest: { position: { x: sx, y: sy, z: sz }, rotation: { x: qx, y: qy, z: qz, w: qw } },
    } as DieMotion
  })
}

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

const rolledDieSchema = z.object({
  t: z.enum(DIE_TYPES),
  v: z.number().int().min(0).max(90),
})

/** What a roll holds: the content a hidden roll keeps in `dmRolls`. */
const contentFields = {
  style: z.enum(DICE_STYLES),
  mode: z.enum(ROLL_MODES),
  modifier: z.number().int().min(MODIFIER_MIN).max(MODIFIER_MAX),
  note: z.string().max(NOTE_MAX),
  dice: z.array(rolledDieSchema).min(1).max(MAX_DICE),
  // Checked leniently: only a bounded string in the rules, decoded on the client (design D4).
  motion: z.string().catch(''),
  sim: z.number().int().catch(SIM_NONE),
}

/** A roll's content as features see it. `motion` is `null` when the record has none or a bad one. */
export type RollContent = {
  style: DiceStyle
  mode: RollMode
  modifier: number
  note: string
  dice: RolledDie[]
  motion: DieMotion[] | null
}

/** A roll in the channel. `content` is `null` for a hidden roll on a player's device. */
export type DiceRoll = {
  id: string
  by: string
  at: Timestamp | null
  hidden: boolean
  content: RollContent | null
}

type StoredContent = {
  style: DiceStyle
  mode: RollMode
  modifier: number
  note: string
  dice: RolledDie[]
  motion: string
  sim: number
}

function contentOf(stored: StoredContent): RollContent {
  const { motion, sim, ...rest } = stored
  return {
    ...rest,
    motion: sim === SIM_THROWS_AND_RESTS ? decodeMotion(motion, stored.dice.length) : null,
  }
}

/** A public roll at `diceRolls/{rollId}`, with its content. */
const publicRollSchema = z
  .object({ by: id, at: serverTime, hidden: z.literal(false), ...contentFields })
  .transform(({ by, at, hidden, ...content }) => ({ by, at, hidden, content: contentOf(content) }))

/** A hidden roll's public record at `diceRolls/{rollId}`: who rolled and when, nothing more. */
const hiddenStubSchema = z
  .object({ by: id, at: serverTime, hidden: z.literal(true) })
  .transform(({ by, at, hidden }) => ({ by, at, hidden, content: null }))

export const diceRollSchema = z.union([publicRollSchema, hiddenStubSchema])
export const diceRollConverter = createConverter(diceRollSchema, { idField: 'id' })

/** A hidden roll's content at `dmRolls/{rollId}`, which only the DM reads. Its ID is the public record's. */
export const dmRollSchema = z
  .object({ by: id, at: serverTime, hidden: z.literal(true), ...contentFields })
  .transform(({ by, at, hidden, ...content }) => ({ by, at, hidden, content: contentOf(content) }))
export const dmRollConverter = createConverter(dmRollSchema, { idField: 'id' })

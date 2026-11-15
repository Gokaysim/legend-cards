/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: the face locators in src/meshes/rounded/*.tsx and
 * src/helpers/getValueFromDiceGroup.ts.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: the locators' positions are a table of directions and values, read without
 * three.js scene objects, with the d20 mesh's own rotation applied. A d10's "0" face is stored as 10, and the d100
 * tens die's "00" as 0.
 */

import type { DieType } from '../../formula'

/** One face: the direction from the die's centre to its locator, in the die's own frame, and the value it shows. */
export type Face = {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly value: number
}

type Locator = readonly [value: number, x: number, y: number, z: number]

const D4: readonly Locator[] = [
  [1, 0, -0.61, -1.27],
  [2, -1.1, -0.61, 0.63],
  [3, 1.1, -0.61, 0.63],
  [4, 0, 1.18, 0],
]
const D6: readonly Locator[] = [
  [1, 0, -0.77, 0],
  [2, -0.77, 0, 0],
  [3, 0, 0, 0.77],
  [4, 0, 0, -0.77],
  [5, 0.77, 0, 0],
  [6, 0, 0.77, 0],
]
const D8: readonly Locator[] = [
  [1, 0.42, 0.52, 0.43],
  [2, -0.47, -0.46, -0.45],
  [3, 0.45, -0.46, -0.47],
  [4, -0.43, 0.52, 0.42],
  [5, -0.42, 0.52, -0.43],
  [6, 0.47, -0.46, 0.45],
  [7, -0.45, -0.46, 0.47],
  [8, 0.43, 0.52, -0.42],
]
/** The d10 and the d100 tens die share their mesh's locators; only the values differ. */
const TEN_SIDED: readonly (readonly [x: number, y: number, z: number])[] = [
  [0.4, 0.42, -0.56],
  [-0.7, -0.37, -0.22],
  [0.01, 0.42, 0.69],
  [0.69, -0.37, -0.23],
  [-0.41, 0.42, -0.55],
  [0.44, -0.37, 0.59],
  [-0.65, 0.42, 0.22],
  [-0.01, -0.37, -0.73],
  [0.66, 0.42, 0.21],
  [-0.42, -0.37, 0.6],
]
const D10: readonly Locator[] = TEN_SIDED.map(([x, y, z], digit) => [
  digit === 0 ? 10 : digit,
  x,
  y,
  z,
])
const D100: readonly Locator[] = TEN_SIDED.map(([x, y, z], digit) => [digit * 10, x, y, z])
const D12: readonly Locator[] = [
  [1, 0, -0.93, 0],
  [2, -0.25, -0.41, -0.8],
  [3, -0.67, 0.44, 0.5],
  [4, -0.84, -0.41, -0.01],
  [5, 0.67, -0.41, 0.5],
  [6, -0.27, -0.41, 0.79],
  [7, 0.25, 0.44, -0.8],
  [8, -0.68, 0.44, -0.48],
  [9, 0.84, 0.44, -0.01],
  [10, 0.68, -0.41, -0.48],
  [11, 0.27, 0.44, 0.79],
  [12, 0, 0.96, 0],
]
const D20: readonly Locator[] = [
  [1, 1.08, -0.21, 0],
  [2, -0.87, -0.2, 0.64],
  [3, 0.57, 0.86, -0.39],
  [4, -0.56, -0.86, -0.39],
  [5, 0.22, -0.88, 0.62],
  [6, -0.34, 0.23, -1.02],
  [7, 0.88, 0.2, 0.64],
  [8, -0.66, 0.88, 0],
  [9, 0.35, -0.24, -1.02],
  [10, -0.21, 0.88, 0.62],
  [11, 0.21, -0.9, -0.6],
  [12, -0.35, 0.19, 1.02],
  [13, 0.67, -0.88, 0],
  [14, -0.87, -0.21, -0.64],
  [15, 0.36, -0.19, 1.02],
  [16, -0.2, 0.9, -0.6],
  [17, 0.53, 0.89, 0.38],
  [18, -0.52, -0.89, 0.38],
  [19, 0.88, 0.21, -0.64],
  [20, -1.07, 0.21, 0],
]

/**
 * The d20 mesh is turned about its z axis inside its group (`rotation={[0, 0, -1.38]}`), and its locators with it.
 * The renderer turns the mesh the same way.
 */
export const D20_MESH_ROTATION_Z = -1.38

function faces(locators: readonly Locator[], turnZ = 0): readonly Face[] {
  const cos = Math.cos(turnZ)
  const sin = Math.sin(turnZ)
  return locators.map(([value, lx, ly, z]) => {
    const x = lx * cos - ly * sin
    const y = lx * sin + ly * cos
    const length = Math.hypot(x, y, z)
    return { x: x / length, y: y / length, z: z / length, value }
  })
}

export const FACES: Record<DieType, readonly Face[]> = {
  d4: faces(D4),
  d6: faces(D6),
  d8: faces(D8),
  d10: faces(D10),
  d12: faces(D12),
  d20: faces(D20, D20_MESH_ROTATION_Z),
  d100: faces(D100),
}

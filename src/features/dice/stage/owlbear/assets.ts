/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: the asset indexes in src/audio/medium/dice/index.ts,
 * src/meshes/DiceMesh.tsx and src/dice/Dice.tsx.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: the assets are found with Vite's `import.meta.glob` as URLs, and only one sound
 * set (medium dice) is kept. The assets themselves are unchanged.
 */

import type { DieType } from '../../formula'
import type { DiceStyle } from '../../schema'

type UrlMap = Record<string, string>

const urls = (map: Record<string, unknown>): UrlMap =>
  Object.fromEntries(Object.entries(map).map(([path, url]) => [path, String(url)]))

const MESHES = urls(
  import.meta.glob('./meshes/**/*.glb', { eager: true, query: '?url', import: 'default' }),
)
const TEXTURES = urls(
  import.meta.glob('./materials/*/*.{jpg,png}', { eager: true, query: '?url', import: 'default' }),
)
const SOUNDS = urls(
  import.meta.glob('./sounds/*.mp3', { eager: true, query: '?url', import: 'default' }),
)

function find(map: UrlMap, path: string): string {
  const url = map[path]
  if (url === undefined) throw new Error(`Missing dice asset: ${path}`)
  return url
}

/** A die's mesh. Walnut dice use the sharp meshes, as in Owlbear; every other style the rounded ones. */
export function meshUrl(style: DiceStyle, type: DieType): string {
  return find(MESHES, `./meshes/${style === 'walnut' ? 'sharp' : 'rounded'}/${type}.glb`)
}

export const TRAY_MESH_URL = find(MESHES, './meshes/tray.glb')

/** A texture of a dice material, or of the tray's (`tray`). */
export function textureUrl(material: DiceStyle | 'tray', file: string): string {
  return find(TEXTURES, `./materials/${material}/${file}`)
}

/** The four impact sounds, in order. */
export const IMPACT_SOUND_URLS: readonly string[] = Object.keys(SOUNDS)
  .sort()
  .map((path) => find(SOUNDS, path))

export { default as ENVIRONMENT_URL } from './environment.hdr?url'

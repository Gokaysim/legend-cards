/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/materials/<style>/<Style>Material.tsx,
 * src/materials/tray/TrayMaterial.tsx and src/helpers/gltfTexture.ts.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: each material is built with plain three.js instead of React Three Fiber and drei's
 * `useTexture`, and loads only its own textures. The material settings are unchanged.
 */

import * as THREE from 'three'

import type { DiceStyle } from '../../schema'
import { textureUrl } from './assets'

type Encoding = 'srgb' | 'linear'

async function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
  encoding: Encoding,
): Promise<THREE.Texture> {
  const texture = await loader.loadAsync(url)
  // The textures are laid out for glTF meshes.
  texture.flipY = false
  texture.colorSpace = encoding === 'srgb' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  return texture
}

/** The usual three maps: the colour, the packed occlusion, roughness and metalness, and the normals. */
async function pbrMaps(loader: THREE.TextureLoader, material: DiceStyle | 'tray') {
  const [map, orm, normalMap] = await Promise.all([
    loadTexture(loader, textureUrl(material, 'albedo.jpg'), 'srgb'),
    loadTexture(loader, textureUrl(material, 'orm.jpg'), 'linear'),
    loadTexture(loader, textureUrl(material, 'normal.jpg'), 'linear'),
  ])
  return { map, aoMap: orm, roughnessMap: orm, metalnessMap: orm, normalMap }
}

/** One dice style's material, with only that style's textures loaded. */
export async function loadDiceMaterial(
  style: DiceStyle,
  loader: THREE.TextureLoader,
): Promise<THREE.Material> {
  switch (style) {
    case 'galaxy':
      return new THREE.MeshPhysicalMaterial({
        ...(await pbrMaps(loader, style)),
        clearcoat: 1,
        clearcoatRoughness: 0.3,
      })
    case 'glass': {
      const [map, transmissionMap, normalMap] = await Promise.all([
        loadTexture(loader, textureUrl(style, 'albedo.jpg'), 'srgb'),
        loadTexture(loader, textureUrl(style, 'mask.png'), 'linear'),
        loadTexture(loader, textureUrl(style, 'normal.jpg'), 'linear'),
      ])
      return new THREE.MeshPhysicalMaterial({
        map,
        sheenColor: new THREE.Color('#4abff4'),
        sheen: 1,
        roughness: 0.3,
        metalness: 0,
        normalMap,
        transmission: 1,
        transmissionMap,
        thickness: 2,
        envMapIntensity: 1,
        attenuationColor: new THREE.Color(43 / 255, 1, 115 / 255),
        attenuationDistance: 0.1,
      })
    }
    case 'iron':
      return new THREE.MeshStandardMaterial({ ...(await pbrMaps(loader, style)), metalness: 1 })
    case 'gemstone':
    case 'nebula':
    case 'sunrise':
    case 'sunset':
    case 'walnut':
      return new THREE.MeshStandardMaterial(await pbrMaps(loader, style))
  }
}

/** The tray's leather and wood. */
export async function loadTrayMaterial(loader: THREE.TextureLoader): Promise<THREE.Material> {
  return new THREE.MeshStandardMaterial(await pbrMaps(loader, 'tray'))
}

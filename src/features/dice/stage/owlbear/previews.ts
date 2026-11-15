/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/previews/<style>/index.ts and src/previews/DicePreview.tsx.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: the pictures are found with Vite's `import.meta.glob` as URLs, without a
 * component. The pictures themselves are unchanged. This module loads no 3D code, so the flat dice can use it.
 */

import type { DieType } from '../../formula'
import type { DiceStyle } from '../../schema'

const PREVIEWS: Record<string, unknown> = import.meta.glob('./previews/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** The 2D preview picture of a die in a style. */
export function previewUrl(style: DiceStyle, type: DieType): string {
  const url = PREVIEWS[`./previews/${style}/${type}.png`]
  if (typeof url !== 'string') throw new Error(`Missing dice preview: ${style} ${type}`)
  return url
}

# Third-party notices

Legend Card Manager is licensed under the GNU General Public License version 3 only (see [LICENSE](LICENSE)). It contains files adapted from the projects below, and public-domain sounds listed under "Sounds". Each adapted code file keeps the upstream copyright notice, names the project and the upstream revision, and says what was changed.

## Owlbear Rodeo dice roller

- **Upstream:** https://github.com/owlbear-rodeo/dice
- **Revision:** commit `ccc32beceee0888c0a48129fbb23f4a636c710ee` (2024-04-11)
- **Copyright:** Copyright (C) 2023 Owlbear Rodeo
- **License:** GNU General Public License version 3 (`GPL-3.0`, as declared in the upstream `package.json` and `LICENSE`)
- **Folder:** [`src/features/dice/stage/owlbear/`](src/features/dice/stage/owlbear/)

What is adapted:

- the collider hull points of the dice, the tray's walls and the physical constants (`physics.ts`), from `src/colliders/`, `src/dice/PhysicsDice.tsx`, `src/dice/DiceRoll.tsx` and `src/helpers/getDieDensity.ts`
- the face locators of the dice (`faces.ts`), from `src/meshes/rounded/` and `src/helpers/getValueFromDiceGroup.ts`
- the throw ranges (`throws.ts`), from `src/helpers/DiceThrower.ts`; the spin is changed: faster, and turning either way about each axis
- the eight dice materials and the tray material (`materials.ts`), from `src/materials/` and `src/helpers/gltfTexture.ts`
- the impact sound handling (`sounds.ts`), from `src/audio/getAudioBuffer.ts` and `src/dice/PhysicsDice.tsx`; it now plays through the app's shared audio context
- the asset indexes (`assets.ts`, `previews.ts`), from `src/audio/medium/dice/index.ts`, `src/meshes/DiceMesh.tsx`, `src/dice/Dice.tsx` and `src/previews/`
- unchanged assets: the dice meshes (`meshes/`, glTF: the rounded ones, and the sharp ones that Owlbear uses for Walnut) and the tray mesh, the material textures (`materials/<style>/`), the environment map (`environment.hdr`), the `medium/dice` impact sounds (`sounds/`), and the dice preview pictures (`previews/<style>/`)

**Asset licenses.** The upstream repository declares no license for its assets other than the project's own GPL-3.0. A search of the upstream tree at this revision (`git grep` for copyright, license, CC0, CC-BY, attribution and asset-site names, outside `LICENSE`) found only the README's license section and the `package.json` license field. The assets are therefore used under the same GPL-3.0.

## Sounds

The two natural sounds, in [`src/features/dice/sound/`](src/features/dice/sound/), come from OpenGameArt under CC0 (public domain dedication); they need no attribution, and are credited here anyway. Each was mixed down to mono, leveled, and encoded as AAC (`.m4a`); the Nat 20 sound was also cut to its first 2.5 seconds with a fade-out.

| File        | Source                                                                                             | Author   | License |
| ----------- | -------------------------------------------------------------------------------------------------- | -------- | ------- |
| `nat20.m4a` | "Win sound effect", https://opengameart.org/content/win-sound-effect (`Win sound.wav`)             | Listener | CC0     |
| `nat1.m4a`  | "Game Over Trumpet SFX", https://opengameart.org/content/game-over-trumpet-sfx (`losetrumpet.wav`) | 0new4y   | CC0     |

## Libraries

The runtime libraries are installed from npm under their own licenses, all of which GPL-3.0 allows: `three` and `@react-three/fiber` (MIT), and `@dimforge/rapier3d-deterministic-compat` (Apache-2.0). Their license texts ship in their packages.

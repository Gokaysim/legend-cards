/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/audio/getAudioBuffer.ts and the collision sound in
 * src/dice/PhysicsDice.tsx.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: plain Web Audio instead of three.js positional audio, one sound set (medium dice)
 * for every impact, and the impacts come from the simulation's record instead of live collision events. Since
 * tune-dice-feel-and-natural-sounds, the audio context, the loading and the playing are the app's shared ones
 * (`src/features/dice/sound/audio.ts`), which wake on the user's first gesture. The cooldown and the volume by speed
 * are unchanged.
 */

import { loadSound, playBuffer, unlockAudio } from '../../sound/audio'
import { IMPACT_SOUND_URLS } from './assets'

/** A die makes at most one sound in this many milliseconds. */
export const SOUND_COOLDOWN_MS = 200

/** The speed at which an impact is at full volume. */
const FULL_VOLUME_SPEED = 5

let buffers: Promise<AudioBuffer[]> | null = null
let next = 0

async function loadBuffers(): Promise<AudioBuffer[]> {
  const loaded = await Promise.all(IMPACT_SOUND_URLS.map(loadSound))
  return loaded.filter((buffer): buffer is AudioBuffer => buffer !== null)
}

/** Loads the impact sounds, once, and wakes the audio. Call it when sound is on, before the first impact. */
export function prepareSounds(): void {
  unlockAudio()
  buffers ??= loadBuffers()
}

/** Plays the next impact sound, louder for a faster die. Does nothing before the sounds have loaded. */
export function playImpact(speed: number): void {
  if (!buffers) return
  void buffers.then((loaded) => {
    const buffer = loaded[next % Math.max(loaded.length, 1)]
    if (!buffer) return
    next = (next + 1) % loaded.length
    playBuffer(buffer, Math.min(speed / FULL_VOLUME_SPEED, 1))
  })
}

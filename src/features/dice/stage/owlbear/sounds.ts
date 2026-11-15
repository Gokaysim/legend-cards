/*
 * Adapted from Owlbear Rodeo's dice roller, https://github.com/owlbear-rodeo/dice
 * at commit ccc32beceee0888c0a48129fbb23f4a636c710ee: src/audio/getAudioBuffer.ts and the collision sound in
 * src/dice/PhysicsDice.tsx.
 * Copyright (C) 2023 Owlbear Rodeo. Licensed under the GNU General Public License version 3 (see LICENSE).
 *
 * Changed for Legend Card Manager: plain Web Audio instead of three.js positional audio, one sound set (medium dice)
 * for every impact, and the impacts come from the simulation's record instead of live collision events. The
 * cooldown and the volume by speed are unchanged.
 */

import { IMPACT_SOUND_URLS } from './assets'

/** A die makes at most one sound in this many milliseconds. */
export const SOUND_COOLDOWN_MS = 200

/** The speed at which an impact is at full volume. */
const FULL_VOLUME_SPEED = 5

let context: AudioContext | null = null
let buffers: Promise<AudioBuffer[]> | null = null
let next = 0

function audioContext(): AudioContext | null {
  if (context) return context
  if (typeof AudioContext === 'undefined') return null
  context = new AudioContext()
  return context
}

async function loadBuffers(audio: AudioContext): Promise<AudioBuffer[]> {
  const loaded = await Promise.all(
    IMPACT_SOUND_URLS.map(async (url) => {
      try {
        const response = await fetch(url)
        return await audio.decodeAudioData(await response.arrayBuffer())
      } catch {
        return null
      }
    }),
  )
  return loaded.filter((buffer): buffer is AudioBuffer => buffer !== null)
}

/** Loads the impact sounds, once. Call it when sound is on, before the first impact. */
export function prepareSounds(): void {
  const audio = audioContext()
  if (!audio) return
  buffers ??= loadBuffers(audio)
  // A browser starts an audio context suspended until the page has had a user gesture.
  if (audio.state === 'suspended') void audio.resume().catch(() => undefined)
}

/** Plays the next impact sound, louder for a faster die. Does nothing before the sounds have loaded. */
export function playImpact(speed: number): void {
  const audio = audioContext()
  if (!audio || !buffers) return
  void buffers.then((loaded) => {
    const buffer = loaded[next % Math.max(loaded.length, 1)]
    if (!buffer) return
    next = (next + 1) % loaded.length
    const source = audio.createBufferSource()
    source.buffer = buffer
    const gain = audio.createGain()
    gain.gain.value = Math.min(speed / FULL_VOLUME_SPEED, 1)
    source.connect(gain).connect(audio.destination)
    source.start()
  })
}

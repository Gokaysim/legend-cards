/**
 * The app's one audio context, shared by the dice's impact sounds and the natural sounds (design D4 of
 * tune-dice-feel-and-natural-sounds). It has no three.js, so every screen can import it.
 *
 * A browser starts an audio context suspended until the page has had a user gesture. `unlockAudio()` runs on the
 * first click or key press (design D5), and every play tries to resume a suspended context, which succeeds once the
 * page has had a gesture. A sound that cannot play at once is dropped, never queued: it would sound late, at the
 * user's first click.
 */

/** A sound waits at most this long for a suspended context to resume; later, it is dropped. */
export const RESUME_GRACE_MS = 300

let context: AudioContext | null = null
const sounds = new Map<string, Promise<AudioBuffer | null>>()

function audioContext(): AudioContext | null {
  if (context) return context
  if (typeof AudioContext === 'undefined') return null
  try {
    context = new AudioContext()
  } catch {
    return null
  }
  return context
}

function resume(audio: AudioContext): Promise<void> {
  return audio.resume().catch(() => undefined)
}

/** Creates the context if needed and resumes it. Call it from a user gesture. */
export function unlockAudio(): void {
  const audio = audioContext()
  if (audio && audio.state === 'suspended') void resume(audio)
}

/** Loads and decodes a sound once; `null` when it cannot be loaded or there is no audio. */
export function loadSound(url: string): Promise<AudioBuffer | null> {
  const cached = sounds.get(url)
  if (cached) return cached
  const audio = audioContext()
  if (!audio) return Promise.resolve(null)
  const loading = (async () => {
    try {
      const response = await fetch(url)
      return await audio.decodeAudioData(await response.arrayBuffer())
    } catch {
      return null
    }
  })()
  sounds.set(url, loading)
  return loading
}

function start(audio: AudioContext, buffer: AudioBuffer, gain: number): void {
  const source = audio.createBufferSource()
  source.buffer = buffer
  const volume = audio.createGain()
  volume.gain.value = gain
  source.connect(volume).connect(audio.destination)
  source.start()
}

/** Plays a sound at a volume from 0 to 1. Without audio, or when the browser keeps it suspended, it plays nothing. */
export function playBuffer(buffer: AudioBuffer, gain: number): void {
  const audio = audioContext()
  if (!audio) return
  if (audio.state === 'running') {
    start(audio, buffer, gain)
    return
  }
  if (audio.state !== 'suspended') return
  const asked = Date.now()
  void resume(audio).then(() => {
    if (audio.state === 'running' && Date.now() - asked <= RESUME_GRACE_MS) {
      start(audio, buffer, gain)
    }
  })
}

/** Forgets the context and the loaded sounds. For tests, which share the module between cases. */
export function resetAudio(): void {
  context = null
  sounds.clear()
}

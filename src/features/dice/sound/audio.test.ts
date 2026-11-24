import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadSound, playBuffer, resetAudio, RESUME_GRACE_MS, unlockAudio } from './audio'

/** A stand-in for the browser's audio context: it records what starts, and resumes only when allowed. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static canResume = true
  state: AudioContextState = 'suspended'
  started: AudioBuffer[] = []
  gains: number[] = []
  destination = {}
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  resume = vi.fn(() => {
    if (FakeAudioContext.canResume) this.state = 'running'
    return Promise.resolve()
  })
  decodeAudioData = vi.fn((data: ArrayBuffer) =>
    data.byteLength === 0
      ? Promise.reject(new Error('Not audio'))
      : Promise.resolve({ length: data.byteLength } as unknown as AudioBuffer),
  )
  createGain() {
    const node = {
      gain: { value: 1 },
      connect: (target: unknown) => target,
    }
    return node
  }
  createBufferSource() {
    const source = {
      buffer: null as AudioBuffer | null,
      connect: (gain: { gain: { value: number } }) => {
        this.gains.push(gain.gain.value)
        return gain
      },
      start: () => {
        if (source.buffer) this.started.push(source.buffer)
      },
    }
    return source
  }
}

const BUFFER = { length: 1 } as unknown as AudioBuffer
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  resetAudio()
  FakeAudioContext.instances = []
  FakeAudioContext.canResume = true
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(url === '/broken.mp3' ? 0 : 8)),
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the shared audio context', () => {
  it('makes one context for every sound and unlock', async () => {
    unlockAudio()
    unlockAudio()
    await loadSound('/a.mp3')
    playBuffer(BUFFER, 1)
    expect(FakeAudioContext.instances).toHaveLength(1)
  })

  it('resumes a suspended context on unlock', () => {
    unlockAudio()
    expect(FakeAudioContext.instances[0]?.resume).toHaveBeenCalled()
  })

  it('resumes a suspended context to play, when the page has had a gesture', async () => {
    playBuffer(BUFFER, 0.5)
    await flush()
    const audio = FakeAudioContext.instances[0]
    expect(audio?.started).toEqual([BUFFER])
    expect(audio?.gains).toEqual([0.5])
  })

  it('drops a sound the browser does not let play, rather than playing it late', async () => {
    FakeAudioContext.canResume = false
    playBuffer(BUFFER, 1)
    await flush()
    FakeAudioContext.canResume = true
    unlockAudio()
    await flush()
    expect(FakeAudioContext.instances[0]?.started).toEqual([])
  })

  it('drops a sound whose resume took longer than the grace', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let finish = () => undefined as void
    FakeAudioContext.canResume = false
    unlockAudio()
    const audio = FakeAudioContext.instances[0] as FakeAudioContext
    audio.resume.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            audio.state = 'running'
            resolve()
          }
        }),
    )
    playBuffer(BUFFER, 1)
    vi.setSystemTime(Date.now() + RESUME_GRACE_MS + 1)
    finish()
    await flush()
    expect(audio.started).toEqual([])
  })

  it('loads a sound once, and skips one that cannot be decoded', async () => {
    const first = loadSound('/a.mp3')
    expect(loadSound('/a.mp3')).toBe(first)
    expect(await first).not.toBeNull()
    expect(await loadSound('/broken.mp3')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does nothing without audio', async () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => unlockAudio()).not.toThrow()
    expect(await loadSound('/a.mp3')).toBeNull()
    expect(() => playBuffer(BUFFER, 1)).not.toThrow()
  })
})

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NATURAL_SOUND_KEY, resetDeviceSettingsMemory } from '../deviceSettings'
import { unlockAudio } from './audio'
import { prepareNaturalSounds } from './natural'
import { useAudioUnlock } from './useAudioUnlock'

vi.mock('./audio', () => ({ unlockAudio: vi.fn() }))
vi.mock('./natural', () => ({ prepareNaturalSounds: vi.fn() }))

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
  vi.mocked(unlockAudio).mockClear()
  vi.mocked(prepareNaturalSounds).mockClear()
})

describe('useAudioUnlock', () => {
  it('wakes the audio and loads the natural sounds on the first pointer press, once', () => {
    const { unmount } = renderHook(() => useAudioUnlock())
    expect(unlockAudio).not.toHaveBeenCalled()

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))

    expect(unlockAudio).toHaveBeenCalledTimes(1)
    expect(prepareNaturalSounds).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('wakes the audio on the first key press', () => {
    const { unmount } = renderHook(() => useAudioUnlock())
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
    expect(unlockAudio).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('loads no natural sound when the device turned them off', () => {
    window.localStorage.setItem(NATURAL_SOUND_KEY, '0')
    const { unmount } = renderHook(() => useAudioUnlock())
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(unlockAudio).toHaveBeenCalledTimes(1)
    expect(prepareNaturalSounds).not.toHaveBeenCalled()
    unmount()
  })

  it('stops listening when it unmounts', () => {
    const { unmount } = renderHook(() => useAudioUnlock())
    unmount()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(unlockAudio).not.toHaveBeenCalled()
  })
})

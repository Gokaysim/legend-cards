import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  lastSeenKey,
  NATURAL_SOUND_KEY,
  resetDeviceSettingsMemory,
  SHOW_3D_KEY,
  SHOW_ROLLS_KEY,
  SOUND_KEY,
  useDiceDeviceSettings,
  useLastSeen,
} from './deviceSettings'

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDiceDeviceSettings', () => {
  it('shows rolls, keeps the impacts silent, plays the natural sounds and shows the dice in 3D by default', () => {
    const { result } = renderHook(() => useDiceDeviceSettings())
    expect(result.current.showRolls).toBe(true)
    expect(result.current.sound).toBe(false)
    expect(result.current.naturalSound).toBe(true)
    expect(result.current.show3d).toBe(true)
  })

  it('keeps "Nat 20 / Nat 1 sesi" off on the device, also after a reload', () => {
    const { result } = renderHook(() => useDiceDeviceSettings())
    act(() => result.current.setNaturalSound(false))
    expect(result.current.naturalSound).toBe(false)
    expect(window.localStorage.getItem(NATURAL_SOUND_KEY)).toBe('0')
    resetDeviceSettingsMemory()
    expect(renderHook(() => useDiceDeviceSettings()).result.current.naturalSound).toBe(false)
    act(() => result.current.setNaturalSound(true))
    expect(window.localStorage.getItem(NATURAL_SOUND_KEY)).toBe('1')
  })

  it('keeps "Zarları 3D göster" off on the device, also for a hook that reads it later', () => {
    const { result } = renderHook(() => useDiceDeviceSettings())
    act(() => result.current.setShow3d(false))
    expect(result.current.show3d).toBe(false)
    expect(window.localStorage.getItem(SHOW_3D_KEY)).toBe('0')
    resetDeviceSettingsMemory()
    expect(renderHook(() => useDiceDeviceSettings()).result.current.show3d).toBe(false)
    act(() => result.current.setShow3d(true))
    expect(window.localStorage.getItem(SHOW_3D_KEY)).toBe('1')
  })

  it('keeps each setting on the device', () => {
    const { result } = renderHook(() => useDiceDeviceSettings())
    act(() => result.current.setShowRolls(false))
    act(() => result.current.setSound(true))
    expect(result.current.showRolls).toBe(false)
    expect(result.current.sound).toBe(true)
    expect(window.localStorage.getItem(SHOW_ROLLS_KEY)).toBe('0')
    expect(window.localStorage.getItem(SOUND_KEY)).toBe('1')
  })

  it('reads what another hook on the device wrote, live', () => {
    const first = renderHook(() => useDiceDeviceSettings())
    const second = renderHook(() => useDiceDeviceSettings())
    act(() => first.result.current.setSound(true))
    expect(second.result.current.sound).toBe(true)
  })

  it('works for the open tab when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { result } = renderHook(() => useDiceDeviceSettings())
    expect(result.current.showRolls).toBe(true)
    expect(result.current.sound).toBe(false)
    act(() => result.current.setSound(true))
    expect(result.current.sound).toBe(true)
  })
})

describe('useLastSeen', () => {
  it('has no time before the first visit, then keeps one per user', () => {
    const { result } = renderHook(() => useLastSeen('ayla'))
    expect(result.current.lastSeen).toBeNull()
    act(() => result.current.markSeen(5000))
    expect(result.current.lastSeen).toBe(5000)
    expect(window.localStorage.getItem(lastSeenKey('ayla'))).toBe('5000')
    expect(renderHook(() => useLastSeen('bora')).result.current.lastSeen).toBeNull()
  })

  it('reads a broken stored time as none, and has none signed out', () => {
    window.localStorage.setItem(lastSeenKey('ayla'), 'yesterday')
    expect(renderHook(() => useLastSeen('ayla')).result.current.lastSeen).toBeNull()
    expect(renderHook(() => useLastSeen(null)).result.current.lastSeen).toBeNull()
  })

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { result } = renderHook(() => useLastSeen('ayla'))
    act(() => result.current.markSeen(7000))
    expect(result.current.lastSeen).toBe(7000)
  })
})

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readDeviceSetting,
  resetDeviceSettingsMemory,
  useDeviceFlag,
  useDeviceSetting,
  writeDeviceSetting,
} from './deviceSetting'

const KEY = 'lcm.test.flag'

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the device settings store', () => {
  it('reads null for a key never set, and the stored value once written', () => {
    expect(readDeviceSetting(KEY)).toBeNull()
    writeDeviceSetting(KEY, 'x')
    expect(readDeviceSetting(KEY)).toBe('x')
    expect(window.localStorage.getItem(KEY)).toBe('x')
  })

  it('keeps the value for this tab when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    writeDeviceSetting(KEY, 'y')
    expect(readDeviceSetting(KEY)).toBe('y')
  })

  it('updates every hook that reads the key', () => {
    const first = renderHook(() => useDeviceSetting(KEY))
    const second = renderHook(() => useDeviceSetting(KEY))

    act(() => writeDeviceSetting(KEY, 'z'))

    expect(first.result.current).toBe('z')
    expect(second.result.current).toBe('z')
  })

  it("follows another tab's change", () => {
    const { result } = renderHook(() => useDeviceSetting(KEY))

    act(() => {
      window.localStorage.setItem(KEY, 'other')
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    })

    expect(result.current).toBe('other')
  })
})

describe('useDeviceFlag', () => {
  it('is the fallback until it is set, then what was set, across remounts', () => {
    const { result, unmount } = renderHook(() => useDeviceFlag(KEY, true))
    expect(result.current[0]).toBe(true)

    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
    expect(window.localStorage.getItem(KEY)).toBe('0')
    unmount()

    expect(renderHook(() => useDeviceFlag(KEY, true)).result.current[0]).toBe(false)
  })
})

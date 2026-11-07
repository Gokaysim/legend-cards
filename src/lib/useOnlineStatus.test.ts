import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useOnlineStatus } from './useOnlineStatus'

function setNetwork(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useOnlineStatus', () => {
  it('starts with the browser network status', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)
  })

  it('follows offline and online events', () => {
    const { result } = renderHook(() => useOnlineStatus())

    setNetwork(false)
    expect(result.current).toBe(false)

    setNetwork(true)
    expect(result.current).toBe(true)
  })
})

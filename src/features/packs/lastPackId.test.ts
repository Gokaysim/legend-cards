import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useLastPackId } from './lastPackId'

describe('useLastPackId', () => {
  it('follows the open pack, and keeps the last one after it ends', () => {
    const { result, rerender } = renderHook(({ open }) => useLastPackId(open), {
      initialProps: { open: null as string | null },
    })
    expect(result.current).toBeNull()

    rerender({ open: 'pack-1' })
    expect(result.current).toBe('pack-1')

    rerender({ open: null })
    expect(result.current).toBe('pack-1')

    rerender({ open: 'pack-2' })
    expect(result.current).toBe('pack-2')
  })

  it('starts on a pack that is already open', () => {
    expect(renderHook(() => useLastPackId('pack-1')).result.current).toBe('pack-1')
  })
})

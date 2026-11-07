import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCollection } from './useCollection'
import { useDocument } from './useDocument'

const EMPTY_READY = { status: 'ready', fromCache: false, hasPendingWrites: false }

describe('subscriptions without a target', () => {
  it('useDocument(null) is ready with no data and needs no Firestore', () => {
    const { result } = renderHook(() => useDocument(null))

    expect(result.current).toEqual({ ...EMPTY_READY, data: null })
  })

  it('useCollection(null) is ready with no documents and needs no Firestore', () => {
    const { result } = renderHook(() => useCollection(null))

    expect(result.current).toEqual({ ...EMPTY_READY, data: [] })
  })

  it('stays ready and stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useCollection(null))
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})

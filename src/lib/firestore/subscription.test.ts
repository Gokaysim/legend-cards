import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ready } from '@/test/fixtures'

import {
  combineSubscriptions,
  equalOrBothNull,
  subscribeOrEmpty,
  useSnapshotSubscription,
} from './subscription'

const failed = {
  status: 'error' as const,
  error: { kind: 'permission-denied' as const, message: 'x', path: 'ledger' },
}

describe('combineSubscriptions', () => {
  it('is ready with every result once all are ready, keeping cache and pending flags', () => {
    expect(
      combineSubscriptions({
        a: ready(1),
        b: { status: 'ready', data: 'x', fromCache: true, hasPendingWrites: false },
        c: { status: 'ready', data: [], fromCache: false, hasPendingWrites: true },
      }),
    ).toEqual({
      status: 'ready',
      data: { a: 1, b: 'x', c: [] },
      fromCache: true,
      hasPendingWrites: true,
    })
  })

  it('is loading while any part loads, and an error as soon as any part fails', () => {
    expect(combineSubscriptions({ a: ready(1), b: { status: 'loading' } })).toEqual({
      status: 'loading',
    })
    expect(combineSubscriptions({ a: { status: 'loading' }, b: failed })).toEqual(failed)
  })
})

describe('useSnapshotSubscription when a DM loses the role', () => {
  // A DM-gated provider subscribes to a DM-only target while the role is DM, and to `null` once it is not (design D7
  // of give-dms-lp-and-share-the-dm-role). The server may deny the old listener before the new profile arrives.
  const subscribe = subscribeOrEmpty<string, string[]>((_target, emit) => {
    emit(failed)
    return () => {}
  }, [])
  const isEqual = equalOrBothNull<string>((a, b) => a === b)

  it("drops the old target's denial once the target becomes null, and shows no error", () => {
    const initialProps: { target: string | null } = { target: 'allowedEmails' }
    const { result, rerender } = renderHook(
      ({ target }) => useSnapshotSubscription(target, isEqual, subscribe),
      { initialProps },
    )
    expect(result.current).toEqual(failed)

    rerender({ target: null })

    expect(result.current).toEqual(ready([]))
  })
})

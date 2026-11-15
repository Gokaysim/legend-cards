import { describe, expect, it } from 'vitest'

import { ready } from '@/test/fixtures'

import { combineSubscriptions } from './subscription'

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

import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { CURSED_BACK, NEUTRAL_BACK } from '@/features/art/spreadBack'

import type { StoredDrawSession } from './schema'
import { isSessionCardUp, SESSION_STALE_MS, sessionBack, sessionState } from './sessions'

const LAST = 1_000_000

const session: StoredDrawSession = {
  kind: 'random',
  uid: 'ayla',
  by: 'dana',
  startedAt: Timestamp.fromMillis(LAST - 5000),
  lastAt: Timestamp.fromMillis(LAST),
  draws: [
    { drawId: 'd0', cardId: 'legend-a', backSet: null },
    { drawId: 'd1', cardId: 'legend-b', backSet: 'Kesqer' },
  ],
  turned: [0],
  endedAt: null,
  endedBy: null,
}

const MINUTE = 60 * 1000

describe('sessionState', () => {
  it('is ended once someone ended it, even while its time is pending', () => {
    expect(sessionState({ ...session, endedBy: 'ayla' }, LAST)).toBe('ended')
  })

  it('is open after 9 idle minutes', () => {
    expect(sessionState(session, LAST + 9 * MINUTE)).toBe('open')
  })

  it('is ended after 10 idle minutes', () => {
    expect(SESSION_STALE_MS).toBe(10 * MINUTE)
    expect(sessionState(session, LAST + 10 * MINUTE)).toBe('ended')
  })

  it('counts a pending last change as now', () => {
    expect(sessionState({ ...session, lastAt: null }, LAST + 60 * MINUTE)).toBe('open')
  })
})

describe('sessionBack', () => {
  it('gives the neutral back without a set filter', () => {
    expect(sessionBack(session, 0)).toEqual(NEUTRAL_BACK)
  })

  it("gives the set's back for a draw with the set filter", () => {
    expect(sessionBack(session, 1)).toEqual({ kind: 'set', setCode: 'Kesqer' })
  })

  it('gives the Cursed back in a Cursed session', () => {
    expect(sessionBack({ ...session, kind: 'cursed' }, 0)).toEqual(CURSED_BACK)
  })
})

describe('isSessionCardUp', () => {
  it('shows turned cards face up while open', () => {
    expect(isSessionCardUp(session, 0, 'open')).toBe(true)
    expect(isSessionCardUp(session, 1, 'open')).toBe(false)
  })

  it('shows every card face up once ended', () => {
    expect(isSessionCardUp(session, 1, 'ended')).toBe(true)
  })
})

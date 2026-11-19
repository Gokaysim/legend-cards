import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import type { Presence } from './schema'
import {
  BEAT_THROTTLE_MS,
  type BeatState,
  clockOffset,
  isReporting,
  LOOK_WINDOW_MS,
  ONLINE_WINDOW_MS,
  onlineUids,
  shouldBeat,
} from './timing'

const NOW = 10 * LOOK_WINDOW_MS

/** A device on screen and connected, that reported long ago. */
function state(overrides: Partial<BeatState> = {}): BeatState {
  return {
    visible: true,
    connected: true,
    leaving: false,
    lastLookedAt: NOW,
    lastBeatAt: NOW - 2 * BEAT_THROTTLE_MS,
    ...overrides,
  }
}

describe('isReporting', () => {
  it('reports while the tab is on screen, however long ago the last look was recorded', () => {
    expect(isReporting(state({ lastLookedAt: 0 }), NOW)).toBe(true)
  })

  it('reports off screen until an hour after the last look, and stops at the hour', () => {
    expect(
      isReporting(state({ visible: false, lastLookedAt: NOW - LOOK_WINDOW_MS + 1 }), NOW),
    ).toBe(true)
    expect(isReporting(state({ visible: false, lastLookedAt: NOW - LOOK_WINDOW_MS }), NOW)).toBe(
      false,
    )
  })

  it('does not report while offline', () => {
    expect(isReporting(state({ connected: false }), NOW)).toBe(false)
  })

  it('does not report while leaving, even on screen', () => {
    expect(isReporting(state({ leaving: true }), NOW)).toBe(false)
  })
})

describe('shouldBeat', () => {
  it('beats for the first time at once', () => {
    expect(shouldBeat(state({ lastBeatAt: null }), NOW)).toBe(true)
  })

  it('beats again once the throttle has passed, not before', () => {
    expect(shouldBeat(state({ lastBeatAt: NOW - BEAT_THROTTLE_MS }), NOW)).toBe(true)
    expect(shouldBeat(state({ lastBeatAt: NOW - BEAT_THROTTLE_MS + 1 }), NOW)).toBe(false)
  })

  it('never beats when the device is not reporting', () => {
    expect(shouldBeat(state({ leaving: true, lastBeatAt: null }), NOW)).toBe(false)
    expect(shouldBeat(state({ connected: false, lastBeatAt: null }), NOW)).toBe(false)
    expect(
      shouldBeat(
        state({ visible: false, lastLookedAt: NOW - LOOK_WINDOW_MS, lastBeatAt: null }),
        NOW,
      ),
    ).toBe(false)
  })
})

describe('clockOffset', () => {
  it('is how far the server time is ahead of the time the report was sent', () => {
    expect(clockOffset(1000, 4000)).toBe(3000)
    expect(clockOffset(5000, 2000)).toBe(-3000)
  })
})

describe('onlineUids', () => {
  const at = (uid: string, millis: number | null): Presence => ({
    uid,
    lastSeen: millis === null ? null : Timestamp.fromMillis(millis),
  })

  it('counts a report at most five minutes old as online, and an older one as offline', () => {
    const records = [at('ayla', NOW - ONLINE_WINDOW_MS), at('bora', NOW - ONLINE_WINDOW_MS - 1)]
    expect([...onlineUids(records, NOW, null)]).toEqual(['ayla'])
  })

  it('counts a pending report as now', () => {
    expect([...onlineUids([at('ayla', null)], NOW, null)]).toEqual(['ayla'])
  })

  it('counts a user without a record as offline', () => {
    expect(onlineUids([at('ayla', NOW)], NOW, null).has('can')).toBe(false)
  })

  it('always counts the signed-in user as online, with or without a record', () => {
    expect(onlineUids([], NOW, 'dana').has('dana')).toBe(true)
    expect(onlineUids([at('dana', 0)], NOW, 'dana').has('dana')).toBe(true)
  })

  it('reads the reports by the server clock, so a device clock that is off does not matter', () => {
    // The device's clock is 10 minutes ahead of the server's: its own report shows the offset.
    const deviceNow = NOW + 10 * 60 * 1000
    const offset = clockOffset(deviceNow, NOW)
    const records = [at('ayla', NOW - 60 * 1000), at('bora', NOW - 20 * 60 * 1000)]
    expect([...onlineUids(records, deviceNow + offset, null)]).toEqual(['ayla'])
    // Without the offset, Ayla's report one minute ago would look 11 minutes old.
    expect([...onlineUids(records, deviceNow, null)]).toEqual([])
  })
})

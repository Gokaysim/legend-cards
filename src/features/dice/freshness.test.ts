import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { arrive, type Freshness, isRecent, NO_FRESHNESS } from './freshness'
import type { DiceRoll } from './schema'

const NOW = 1_000_000

function rollAt(id: string, at: number | null, overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id,
    by: 'bora',
    at: at === null ? null : Timestamp.fromMillis(at),
    hidden: false,
    content: {
      style: 'galaxy',
      mode: 'normal',
      modifier: 0,
      note: '',
      dice: [{ t: 'd20', v: 12 }],
      motion: null,
    },
    ...overrides,
  }
}

const nothingRolledHere: ReadonlySet<string> = new Set()

/** The freshness after a first snapshot of `rolls`, newest first. */
function started(rolls: DiceRoll[]): Freshness {
  return arrive(NO_FRESHNESS, rolls, NOW, nothingRolledHere)
}

describe('only fresh rolls play', () => {
  it('plays nothing from the first snapshot, as after a reload, and knows its rolls', () => {
    const rolls = [rollAt('c', NOW - 1000), rollAt('b', NOW - 2000), rollAt('a', NOW - 3000)]
    const state = started(rolls)
    expect(state.fresh).toBeNull()
    expect([...(state.known ?? [])]).toEqual(['c', 'b', 'a'])
  })

  it('plays a roll that arrives later and was made just now', () => {
    const before = [rollAt('a', NOW - 60_000)]
    const fresh = rollAt('b', NOW - 500)
    const state = arrive(started(before), [fresh, ...before], NOW, nothingRolledHere)
    expect(state.fresh).toBe(fresh)
  })

  it('plays a pending roll, whose time counts as now', () => {
    const pending = rollAt('b', null)
    expect(arrive(started([]), [pending], NOW, nothingRolledHere).fresh).toBe(pending)
  })

  it('plays nothing when four rolls a minute old arrive together, as back online', () => {
    const old = [1, 2, 3, 4].map((n) => rollAt(`r${n}`, NOW - 60_000 - n * 1000))
    const state = arrive(started([]), old, NOW, nothingRolledHere)
    expect(state.fresh).toBeNull()
    expect(state.known?.size).toBe(4)
  })

  it('plays only the newest of rolls that arrive together', () => {
    const newest = rollAt('d', NOW - 100)
    const state = arrive(
      started([]),
      [newest, rollAt('c', NOW - 200), rollAt('b', NOW - 300)],
      NOW,
      nothingRolledHere,
    )
    expect(state.fresh).toBe(newest)
  })

  it("does not play this device's own roll again when its record arrives", () => {
    const mine = rollAt('mine', null, { by: 'ayla' })
    const state = arrive(started([]), [mine], NOW, new Set(['mine']))
    expect(state.fresh).toBeNull()
    expect(state.known?.has('mine')).toBe(true)
  })

  it("never plays a hidden roll on a player's device", () => {
    const hidden = rollAt('h', NOW - 100, { by: 'dana', hidden: true, content: null })
    expect(arrive(started([]), [hidden], NOW, nothingRolledHere).fresh).toBeNull()
  })

  it("plays a hidden roll on the DM's device, whose content arrived", () => {
    const hidden = rollAt('h', NOW - 100, { by: 'dana', hidden: true })
    expect(arrive(started([]), [hidden], NOW, nothingRolledHere).fresh).toBe(hidden)
  })

  it('keeps the last fresh roll, and returns the same state when nothing arrived', () => {
    const fresh = rollAt('b', NOW - 100)
    const state = arrive(started([]), [fresh], NOW, nothingRolledHere)
    expect(arrive(state, [fresh], NOW, nothingRolledHere)).toBe(state)
    const later = arrive(state, [rollAt('c', NOW - 30_000), fresh], NOW, nothingRolledHere)
    expect(later.fresh).toBe(fresh)
  })

  it('counts a time ahead of this clock as recent', () => {
    expect(isRecent(rollAt('a', NOW + 30_000), NOW)).toBe(true)
    expect(isRecent(rollAt('a', NOW - 10_000), NOW)).toBe(true)
    expect(isRecent(rollAt('a', NOW - 10_001), NOW)).toBe(false)
  })
})

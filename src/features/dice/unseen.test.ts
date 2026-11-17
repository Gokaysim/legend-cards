import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testHiddenRoll, testRoll } from '@/test/diceFixtures'

import { unseenCount, unseenLabel } from './unseen'

const at = (millis: number) => Timestamp.fromMillis(millis)

describe('unseenCount (spec: dice-rolls, "Rolls the user has not seen")', () => {
  const bora = testRoll({ by: 'bora', at: at(2000) })
  const cem = testRoll({ by: 'cem', at: at(3000) })
  const mine = testRoll({ by: 'ayla', at: at(4000) })
  const old = testRoll({ by: 'bora', at: at(500) })

  it("counts other users' rolls made after the last visit, not the user's own", () => {
    expect(unseenCount([old, bora, cem, mine], 'ayla', 1000)).toBe(2)
  })

  it('counts nothing before the first visit, and no hidden roll a player cannot read', () => {
    expect(unseenCount([bora, cem], 'ayla', null)).toBe(0)
    expect(unseenCount([testHiddenRoll({ at: at(2000) })], 'ayla', 1000)).toBe(0)
  })

  it('drops to nothing when the DM resets the channel', () => {
    expect(unseenCount([bora, cem], 'ayla', 1000)).toBe(2)
    expect(unseenCount([], 'ayla', 1000)).toBe(0)
    expect(unseenLabel(unseenCount([], 'ayla', 1000))).toBeNull()
  })
})

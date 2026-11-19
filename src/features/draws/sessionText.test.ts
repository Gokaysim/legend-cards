import { describe, expect, it } from 'vitest'

import { testProfile } from '@/test/fixtures'

import type { DrawSession } from './schema'
import { sessionPayment } from './sessionText'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const dana = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })
const profileOf = (uid: string) => [ayla, dana].find((profile) => profile.id === uid)

const card = (index: number, cost: number | null) => ({
  drawId: `d${index}`,
  cardId: `legend-${index}`,
  backSet: null,
  cost,
})

const session = (
  by: string,
  costs: (number | null)[],
  kind: DrawSession['kind'] = 'random',
): Pick<DrawSession, 'kind' | 'uid' | 'by' | 'draws'> => ({
  kind,
  uid: 'ayla',
  by,
  draws: costs.map((cost, index) => card(index, cost)),
})

describe('sessionPayment', () => {
  it("adds up the cards' prices", () => {
    expect(sessionPayment(session('ayla', [1, 3, 0]), profileOf)).toBe(4)
    expect(sessionPayment(session('dana', [2, 1]), profileOf)).toBe(3)
  })

  it('is 0 for a session of free cards', () => {
    expect(sessionPayment(session('ayla', [0, 0]), profileOf)).toBe(0)
    expect(sessionPayment(session('ayla', [0], 'cursed'), profileOf)).toBe(0)
  })

  it('counts a card stored without its price by the old rule', () => {
    expect(sessionPayment(session('ayla', [null, null]), profileOf)).toBe(2)
    expect(sessionPayment(session('dana', [null, null]), profileOf)).toBe(0)
    expect(sessionPayment(session('ayla', [null], 'cursed'), profileOf)).toBe(0)
    expect(sessionPayment(session('ayla', [null, 3]), profileOf)).toBe(4)
  })
})

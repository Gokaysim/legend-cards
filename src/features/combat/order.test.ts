import { describe, expect, it } from 'vitest'

import {
  canStepBack,
  delayTurn,
  initiativeOrder,
  moveItem,
  naturalMark,
  nextTurn,
  type OrderEntry,
  previousTurn,
  type TieBreaker,
  turnAfterRemoval,
  turnAfterReorder,
} from './order'

let seq = 0
const entry = (id: string, die: number | null, modifier = 0): OrderEntry => ({
  id,
  seq: seq++,
  die,
  modifier,
})

const reversed: TieBreaker = (items) => [...items].reverse()

describe('naturalMark', () => {
  it('marks a natural 20 and a natural 1, and nothing else', () => {
    expect(naturalMark(20)).toBe('nat20')
    expect(naturalMark(1)).toBe('nat1')
    expect(naturalMark(19)).toBeNull()
    expect(naturalMark(null)).toBeNull()
  })
})

describe('initiativeOrder', () => {
  it('puts a natural 1 with a high modifier after a low total', () => {
    expect(initiativeOrder([entry('thorn', 1, 12), entry('elara', 4, 0)])).toEqual([
      'elara',
      'thorn',
    ])
  })

  it('puts a natural 20 with a low modifier first', () => {
    expect(initiativeOrder([entry('thorn', 22, 3), entry('goblin3', 20, -1)])).toEqual([
      'goblin3',
      'thorn',
    ])
  })

  it('orders the totals from high to low', () => {
    expect(
      initiativeOrder([entry('a', 5, 1), entry('b', 15, 2), entry('c', 9, 0), entry('d', 12, 4)]),
    ).toEqual(['b', 'd', 'c', 'a'])
  })

  it('keeps equal totals together, in join order by default', () => {
    expect(
      initiativeOrder([entry('thorn', 14, 3), entry('goblin', 2, 1), entry('elara', 15, 2)]),
    ).toEqual(['thorn', 'elara', 'goblin'])
  })

  it('puts those without a roll last, in join order', () => {
    expect(
      initiativeOrder([
        entry('late', null),
        entry('nat1', 1, 5),
        entry('early', null),
        entry('x', 8),
      ]),
    ).toEqual(['x', 'nat1', 'late', 'early'])
  })

  it('lets the tie breaker order every tie, and nothing else', () => {
    const order = initiativeOrder(
      [
        entry('t1', 20),
        entry('t2', 20, 5),
        entry('a', 10, 2),
        entry('b', 12, 0),
        entry('solo', 15),
        entry('o1', 1),
        entry('o2', 1, 3),
        entry('wait1', null),
        entry('wait2', null),
      ],
      reversed,
    )
    expect(order).toEqual(['t2', 't1', 'solo', 'b', 'a', 'o2', 'o1', 'wait1', 'wait2'])
  })
})

describe('turn steps', () => {
  it('steps on, and into the next round after the last', () => {
    expect(nextTurn({ turn: 0, round: 1 }, 3)).toEqual({ turn: 1, round: 1 })
    expect(nextTurn({ turn: 2, round: 2 }, 3)).toEqual({ turn: 0, round: 3 })
    expect(nextTurn({ turn: 0, round: 1 }, 0)).toEqual({ turn: 0, round: 1 })
  })

  it('steps back, across a round, but not before round 1', () => {
    expect(previousTurn({ turn: 2, round: 1 }, 3)).toEqual({ turn: 1, round: 1 })
    expect(previousTurn({ turn: 0, round: 3 }, 3)).toEqual({ turn: 2, round: 2 })
    expect(canStepBack({ turn: 0, round: 1 }, 3)).toBe(false)
    expect(previousTurn({ turn: 0, round: 1 }, 3)).toEqual({ turn: 0, round: 1 })
  })
})

describe('turnAfterRemoval', () => {
  const order = ['a', 'b', 'c', 'd']

  it('moves the active place up when an earlier one is removed', () => {
    expect(turnAfterRemoval(order, { turn: 2, round: 1 }, 'a')).toEqual({
      order: ['b', 'c', 'd'],
      turn: 1,
      round: 1,
    })
  })

  it('keeps the active place when a later one is removed', () => {
    expect(turnAfterRemoval(order, { turn: 1, round: 2 }, 'd')).toEqual({
      order: ['a', 'b', 'c'],
      turn: 1,
      round: 2,
    })
  })

  it('makes the next one active when the active one is removed', () => {
    expect(turnAfterRemoval(order, { turn: 1, round: 2 }, 'b')).toEqual({
      order: ['a', 'c', 'd'],
      turn: 1,
      round: 2,
    })
  })

  it('starts the next round when the active last one is removed', () => {
    expect(turnAfterRemoval(order, { turn: 3, round: 2 }, 'd')).toEqual({
      order: ['a', 'b', 'c'],
      turn: 0,
      round: 3,
    })
  })

  it('keeps only the turn and the round of a larger state', () => {
    const combat = { turn: 1, round: 2, order: ['x'], phase: 'running' }
    expect(turnAfterRemoval(order, combat, 'a')).toEqual({
      order: ['b', 'c', 'd'],
      turn: 0,
      round: 2,
    })
    expect(nextTurn(combat, 0)).toEqual({ turn: 1, round: 2 })
  })

  it('leaves an empty order at the first place', () => {
    expect(turnAfterRemoval(['a'], { turn: 0, round: 4 }, 'a')).toEqual({
      order: [],
      turn: 0,
      round: 4,
    })
  })
})

describe('turnAfterReorder', () => {
  it('follows the active combatant', () => {
    const before = ['a', 'b', 'c', 'd']
    const after = moveItem(before, 1, 3)
    expect(after).toEqual(['a', 'c', 'd', 'b'])
    expect(turnAfterReorder(before, after, 1)).toBe(3)
    expect(turnAfterReorder(before, after, 2)).toBe(1)
  })
})

describe('delayTurn', () => {
  const order = ['a', 'b', 'c', 'd']

  it('swaps the first place with the next one, which becomes active', () => {
    expect(delayTurn(order, { turn: 0, round: 1 })).toEqual({
      order: ['b', 'a', 'c', 'd'],
      turn: 0,
      round: 1,
    })
  })

  it('swaps a middle place with the next one', () => {
    expect(delayTurn(order, { turn: 1, round: 2 })).toEqual({
      order: ['a', 'c', 'b', 'd'],
      turn: 1,
      round: 2,
    })
  })

  it('swaps the second-to-last place with the last one', () => {
    expect(delayTurn(order, { turn: 2, round: 2 })).toEqual({
      order: ['a', 'b', 'd', 'c'],
      turn: 2,
      round: 2,
    })
  })

  it('moves the last place behind the first one in the next round', () => {
    expect(delayTurn(order, { turn: 3, round: 2 })).toEqual({
      order: ['a', 'd', 'b', 'c'],
      turn: 0,
      round: 3,
    })
  })

  it('keeps two combatants in place when the last one delays', () => {
    expect(delayTurn(['a', 'b'], { turn: 1, round: 1 })).toEqual({
      order: ['a', 'b'],
      turn: 0,
      round: 2,
    })
  })

  it('changes nothing with one combatant', () => {
    expect(delayTurn(['a'], { turn: 0, round: 3 })).toEqual({ order: ['a'], turn: 0, round: 3 })
  })
})

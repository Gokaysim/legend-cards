import { describe, expect, it, vi } from 'vitest'

import { cryptoRandom, pickRandom, randomIndex, sample, shuffle } from './random'

/** A fake source that returns `values` in turn. */
const sequence = (...values: number[]) => {
  let index = 0
  return vi.fn(() => values[index++] ?? 0)
}

describe('pickRandom', () => {
  it('picks the item the injected source points at', () => {
    expect(pickRandom(['a', 'b', 'c'], sequence(4))).toBe('b')
  })

  it('can pick every item', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const picks = items.map((_, value) => pickRandom(items, sequence(value)))
    expect(picks).toEqual(items)
  })

  it('gives null for an empty list, without drawing a number', () => {
    const random = sequence(1)
    expect(pickRandom([], random)).toBeNull()
    expect(random).not.toHaveBeenCalled()
  })

  it('draws again when the number falls into the biased top range', () => {
    // 2^32 is 1 more than a multiple of 3, so 2^32 − 1 would favor index 0.
    const random = sequence(2 ** 32 - 1, 4)
    expect(randomIndex(3, random)).toBe(1)
    expect(random).toHaveBeenCalledTimes(2)
    expect(randomIndex(3, sequence(2 ** 32 - 2))).toBe(2)
  })

  it('uses the browser crypto by default', () => {
    const value = cryptoRandom()
    expect(Number.isInteger(value) && value >= 0 && value < 2 ** 32).toBe(true)
    expect(['x']).toContain(pickRandom(['x']))
  })
})

describe('sample', () => {
  it('never repeats an item', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const picked = sample(items, 5, sequence(7, 7, 7, 7, 7))
    expect(picked).toHaveLength(5)
    expect(new Set(picked).size).toBe(5)
  })

  it('returns every item when n is the length', () => {
    const items = ['a', 'b', 'c', 'd']
    expect([...sample(items, 4, sequence(3, 2, 1, 0))].sort()).toEqual(items)
  })

  it('returns at most the whole list, and nothing for n 0', () => {
    expect(sample(['a', 'b'], 5, sequence(0, 0))).toHaveLength(2)
    expect(sample(['a', 'b'], 0)).toEqual([])
  })

  it('can return each item first', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const firsts = items.map((_, value) => sample(items, 1, sequence(value))[0])
    expect(firsts).toEqual(items)
  })

  it('leaves the input list alone', () => {
    const items = ['a', 'b', 'c']
    sample(items, 3, sequence(2, 1, 0))
    expect(items).toEqual(['a', 'b', 'c'])
  })
})

describe('shuffle', () => {
  it('keeps every item once', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const shuffled = shuffle(items, sequence(5, 0, 3, 1, 1, 0))
    expect([...shuffled].sort()).toEqual(items)
    expect(shuffled).not.toEqual(items)
  })
})

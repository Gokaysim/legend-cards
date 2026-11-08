import { describe, expect, it, vi } from 'vitest'

import { cryptoRandom, pickRandom, randomIndex } from './pick'

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

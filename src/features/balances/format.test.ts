import { describe, expect, it } from 'vitest'

import { formatAmount, formatDelta } from './format'

describe('formatAmount', () => {
  it('groups digits the Turkish way', () => {
    expect(formatAmount(12500)).toBe('12.500')
    expect(formatAmount(1_000_000)).toBe('1.000.000')
    expect(formatAmount(7)).toBe('7')
    expect(formatAmount(0)).toBe('0')
  })
})

describe('formatDelta', () => {
  it('signs a change', () => {
    expect(formatDelta(2)).toBe('+2')
    expect(formatDelta(-2500)).toBe('−2.500')
  })
})

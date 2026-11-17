import { describe, expect, it } from 'vitest'

import {
  type DiceCounts,
  type DieType,
  type RolledDie,
  DIE_TYPES,
  canAdd,
  checkedModifierSum,
  countsOf,
  emptyCounts,
  formulaText,
  isSingleD20,
  keptIndexes,
  modifierLabel,
  modifierTerms,
  parseModifier,
  naturalMark,
  percentileValue,
  physicalCount,
  physicalDice,
  resultGroups,
  rollTotal,
} from './formula'

function counts(dice: Partial<DiceCounts>): DiceCounts {
  return { ...emptyCounts(), ...dice }
}

function rolled(...dice: [DieType, number][]): RolledDie[] {
  return dice.map(([t, v]) => ({ t, v }))
}

describe('building a roll', () => {
  it('mixes dice and a fixed number in the formula order', () => {
    expect(formulaText(counts({ d20: 1, d6: 2 }), 3)).toBe('1d20 + 2d6 + 3')
  })

  it('names each type once with its count, in the order d20, d12, d10, d8, d6, d4, d100', () => {
    const all = counts({ d4: 1, d6: 1, d8: 1, d10: 1, d12: 1, d20: 1, d100: 1 })
    expect(formulaText(all, 0)).toBe('1d20 + 1d12 + 1d10 + 1d8 + 1d6 + 1d4 + 1d100')
  })

  it('writes a negative fixed number with a minus sign, and leaves out 0', () => {
    expect(formulaText(counts({ d20: 1 }), -2)).toBe('1d20 − 2')
    expect(formulaText(counts({ d8: 3 }), 0)).toBe('3d8')
  })

  it('is empty without dice', () => {
    expect(formulaText(emptyCounts(), 5)).toBe('')
  })

  it('throws the dice in the formula order, a d100 as its tens die and then its d10', () => {
    expect(physicalDice(counts({ d6: 2, d20: 1, d100: 1 }), 'normal')).toEqual([
      'd20',
      'd6',
      'd6',
      'd100',
      'd10',
    ])
  })
})

describe('at most twelve dice', () => {
  it('counts a d100 as two physical dice', () => {
    expect(physicalCount(counts({ d100: 1, d6: 3 }))).toBe(5)
  })

  it('disables every die with twelve d6', () => {
    const full = counts({ d6: 12 })
    expect(DIE_TYPES.filter((type) => canAdd(full, type))).toEqual([])
  })

  it('disables only the d100 with eleven physical dice', () => {
    const eleven = counts({ d6: 9, d100: 1 })
    expect(physicalCount(eleven)).toBe(11)
    expect(canAdd(eleven, 'd100')).toBe(false)
    expect(DIE_TYPES.filter((type) => type !== 'd100').every((type) => canAdd(eleven, type))).toBe(
      true,
    )
  })
})

describe('advantage and disadvantage', () => {
  it('are offered only for exactly one d20', () => {
    expect(isSingleD20(counts({ d20: 1 }))).toBe(true)
    expect(isSingleD20(counts({ d20: 1, d6: 1 }))).toBe(false)
    expect(isSingleD20(counts({ d20: 2 }))).toBe(false)
  })

  it('throw two d20', () => {
    expect(physicalDice(counts({ d20: 1 }), 'advantage')).toEqual(['d20', 'd20'])
    expect(physicalDice(counts({ d20: 1 }), 'disadvantage')).toEqual(['d20', 'd20'])
  })

  it('throw a normal roll for any other formula', () => {
    expect(physicalDice(counts({ d20: 1, d6: 1 }), 'advantage')).toEqual(['d20', 'd6'])
  })

  it('keep 20 of 20 and 8 with advantage, and total 25 with + 5', () => {
    const dice = rolled(['d20', 8], ['d20', 20])
    expect(keptIndexes(dice, 'advantage')).toEqual([1])
    expect(rollTotal(dice, 'advantage', 5)).toBe(25)
  })

  it('keep the lower die with disadvantage', () => {
    const dice = rolled(['d20', 8], ['d20', 20])
    expect(keptIndexes(dice, 'disadvantage')).toEqual([0])
    expect(rollTotal(dice, 'disadvantage', 0)).toBe(8)
  })

  it('keep the first die on a tie', () => {
    expect(keptIndexes(rolled(['d20', 11], ['d20', 11]), 'advantage')).toEqual([0])
  })

  it('read as one d20 in the formula', () => {
    expect(formulaText(countsOf(rolled(['d20', 8], ['d20', 20]), 'advantage'), 5)).toBe('1d20 + 5')
  })
})

describe('results and the total', () => {
  it('total a mixed roll from its kept dice and the fixed number', () => {
    expect(rollTotal(rolled(['d20', 17], ['d6', 4], ['d6', 2]), 'normal', 3)).toBe(26)
  })

  it('read a d100 from its tens die and its d10', () => {
    expect(percentileValue(30, 7)).toBe(37)
    expect(rollTotal(rolled(['d100', 30], ['d10', 7]), 'normal', 0)).toBe(37)
  })

  it('read 00 and 0 as 100', () => {
    expect(percentileValue(0, 10)).toBe(100)
  })

  it('read the d10 of a pair as 0 to 9, and a lone d10 as 1 to 10', () => {
    expect(percentileValue(90, 10)).toBe(90)
    expect(percentileValue(0, 5)).toBe(5)
    expect(rollTotal(rolled(['d10', 10]), 'normal', 0)).toBe(10)
  })

  it('group a percentile pair as one result, and every other die alone', () => {
    expect(resultGroups(rolled(['d20', 3], ['d100', 40], ['d10', 2], ['d10', 7]))).toEqual([
      { type: 'd20', value: 3, indexes: [0] },
      { type: 'd100', value: 42, indexes: [1, 2] },
      { type: 'd10', value: 7, indexes: [3] },
    ])
  })

  it('count a percentile pair as one d100 in the formula', () => {
    expect(formulaText(countsOf(rolled(['d100', 40], ['d10', 2], ['d10', 7]), 'normal'), 0)).toBe(
      '1d10 + 1d100',
    )
  })
})

describe('natural 20 and natural 1', () => {
  it('marks a natural 20 kept with advantage', () => {
    expect(naturalMark(rolled(['d20', 20], ['d20', 8]), 'advantage')).toBe('natural20')
  })

  it('marks a natural 1 on a single d20', () => {
    expect(naturalMark(rolled(['d20', 1]), 'normal')).toBe('natural1')
  })

  it('marks no 20 among other dice', () => {
    expect(naturalMark(rolled(['d20', 20], ['d6', 3]), 'normal')).toBeNull()
  })

  it('marks a 1 only when the roll keeps it', () => {
    expect(naturalMark(rolled(['d20', 1], ['d20', 15]), 'advantage')).toBeNull()
    expect(naturalMark(rolled(['d20', 1], ['d20', 15]), 'disadvantage')).toBe('natural1')
  })

  it('marks nothing on another die', () => {
    expect(naturalMark(rolled(['d12', 1]), 'normal')).toBeNull()
  })
})

describe('parseModifier', () => {
  it('reads a whole number, signed or not, and an empty field as 0, with no written sum', () => {
    expect(parseModifier('3')).toEqual({ total: 3, sum: null })
    expect(parseModifier('-4')).toEqual({ total: -4, sum: null })
    expect(parseModifier('+07')).toEqual({ total: 7, sum: null })
    expect(parseModifier('')).toEqual({ total: 0, sum: null })
    expect(parseModifier('  ')).toEqual({ total: 0, sum: null })
  })

  it('sums whole numbers joined by + and −, and keeps them as a canonical written sum', () => {
    expect(parseModifier('4+4-5')).toEqual({ total: 3, sum: '4+4-5' })
    expect(parseModifier('5+10-4')).toEqual({ total: 11, sum: '5+10-4' })
    expect(parseModifier(' 5 + 10 − 4 ')).toEqual({ total: 11, sum: '5+10-4' })
    expect(parseModifier(' -2 - 3 ')).toEqual({ total: -5, sum: '-2-3' })
    expect(parseModifier('+05+3')).toEqual({ total: 8, sum: '5+3' })
  })

  it('takes eight numbers, each up to 99, and a total from −99 to +99', () => {
    expect(parseModifier('1+1+1+1+1+1+1+1')).toEqual({ total: 8, sum: '1+1+1+1+1+1+1+1' })
    expect(parseModifier('99')).toEqual({ total: 99, sum: null })
    expect(parseModifier('-50-49')).toEqual({ total: -99, sum: '-50-49' })
  })

  it('refuses a sum outside the range instead of clamping it', () => {
    for (const text of ['90+20', '-60-60', '150', '100-5', '1+1+1+1+1+1+1+1+1']) {
      expect(parseModifier(text)).toBeNull()
    }
  })

  it('refuses anything else', () => {
    for (const text of ['4+', '+', '4++4', '4*2', '1d4', 'abc', '4.5', '4 4']) {
      expect(parseModifier(text)).toBeNull()
    }
  })
})

describe('showing the fixed number', () => {
  it('shows a written sum in the formula, after the dice and as numbers', () => {
    expect(formulaText(counts({ d20: 1 }), 11, '5+10-4')).toBe('1d20 + 5 + 10 − 4')
    expect(formulaText(counts({ d20: 1 }), -5, '-2-3')).toBe('1d20 − 2 − 3')
    expect(modifierLabel(11, '5+10-4')).toBe('+5 +10 −4')
    expect(modifierTerms(11, '5+10-4')).toEqual([5, 10, -4])
  })

  it('shows a single number as before', () => {
    expect(formulaText(counts({ d20: 1 }), 3)).toBe('1d20 + 3')
    expect(modifierLabel(3)).toBe('+3')
    expect(modifierLabel(-2)).toBe('−2')
    expect(modifierLabel(0)).toBe('')
  })

  it('falls back to the fixed number when the written sum does not add up or does not parse', () => {
    expect(formulaText(counts({ d20: 1 }), 11, '5+10-3')).toBe('1d20 + 11')
    expect(formulaText(counts({ d20: 1 }), 11, '5+*6')).toBe('1d20 + 11')
    expect(modifierLabel(11, '11')).toBe('+11')
    expect(checkedModifierSum(11, '5+10-4')).toBe('5+10-4')
    expect(checkedModifierSum(11, '5+10-3')).toBeNull()
    expect(checkedModifierSum(11, undefined)).toBeNull()
  })
})

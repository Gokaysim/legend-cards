import { describe, expect, it } from 'vitest'

import {
  type DiceCounts,
  type DieType,
  type FormulaPart,
  type RolledDie,
  DIE_TYPES,
  canAdd,
  checkedModifierSum,
  checkedParts,
  countsOf,
  emptyCounts,
  formulaPartsText,
  formulaText,
  isSingleD20,
  keptIndexes,
  maxCount,
  modifierLabel,
  modifierTerms,
  onePart,
  parseFormula,
  parseModifier,
  naturalMark,
  percentileValue,
  physicalCount,
  partsPhysicalCount,
  partsText,
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

describe('at most sixty dice', () => {
  it('counts a d100 as two physical dice', () => {
    expect(physicalCount(counts({ d100: 1, d6: 3 }))).toBe(5)
  })

  it('keeps every die enabled with twelve d6', () => {
    expect(DIE_TYPES.every((type) => canAdd(counts({ d6: 12 }), type))).toBe(true)
  })

  it('disables every die with sixty d6', () => {
    const full = counts({ d6: 60 })
    expect(DIE_TYPES.filter((type) => canAdd(full, type))).toEqual([])
  })

  it('disables only the d100 with fifty-nine physical dice', () => {
    const fiftyNine = counts({ d6: 57, d100: 1 })
    expect(physicalCount(fiftyNine)).toBe(59)
    expect(canAdd(fiftyNine, 'd100')).toBe(false)
    expect(
      DIE_TYPES.filter((type) => type !== 'd100').every((type) => canAdd(fiftyNine, type)),
    ).toBe(true)
  })

  it('caps a count typed on a chip to what fits with the other dice', () => {
    expect(maxCount(counts({ d20: 1 }), 'd6')).toBe(59)
    expect(maxCount(counts({ d20: 1, d6: 4 }), 'd6')).toBe(59)
    expect(maxCount(counts({ d6: 1 }), 'd100')).toBe(29)
    expect(maxCount(emptyCounts(), 'd100')).toBe(30)
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

  it('read a lone tens die, which the rules allow, as a die of its own and add its face', () => {
    const dice = rolled(['d6', 4], ['d100', 30], ['d6', 2])
    expect(resultGroups(dice)).toEqual([
      { type: 'd6', value: 4, indexes: [0] },
      { type: 'd100', value: 30, indexes: [1] },
      { type: 'd6', value: 2, indexes: [2] },
    ])
    expect(rollTotal(dice, 'normal', 0)).toBe(36)
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

describe('parseFormula (spec: dice-rolls, "A typed formula")', () => {
  const okParts = (text: string) => {
    const parsed = parseFormula(text)
    if (!parsed.ok) throw new Error(`${text} refused: ${parsed.reason}`)
    return parsed.parts
  }
  const ok = (text: string) => {
    const parts = okParts(text)
    if (parts.length !== 1) throw new Error(`${text} has ${parts.length} parts`)
    return parts[0] as FormulaPart
  }

  it('reads a big roll and its fixed number', () => {
    expect(ok('40d6+5')).toEqual({ counts: counts({ d6: 40 }), modifier: 5, modifierSum: null })
  })

  it('adds up terms of the same die', () => {
    expect(ok('2d6+3d6').counts).toEqual(counts({ d6: 5 }))
  })

  it('reads a missing count as 1, either case, and d% as d100', () => {
    expect(ok('D20+4')).toMatchObject({ counts: counts({ d20: 1 }), modifier: 4 })
    expect(ok('d%').counts).toEqual(counts({ d100: 1 }))
    expect(ok('2D100+d10').counts).toEqual(counts({ d100: 2, d10: 1 }))
  })

  it('keeps the numbers among the dice as a written sum, in order', () => {
    expect(ok('5+1d20+3')).toMatchObject({
      counts: counts({ d20: 1 }),
      modifier: 8,
      modifierSum: '5+3',
    })
    expect(ok('1d20+5+10-4')).toMatchObject({ modifier: 11, modifierSum: '5+10-4' })
  })

  it('ignores spaces around the signs and reads − and – as minus', () => {
    expect(ok(' -2 - 3 + 1d6 ')).toMatchObject({
      counts: counts({ d6: 1 }),
      modifier: -5,
      modifierSum: '-2-3',
    })
    expect(ok('1d20 − 2')).toMatchObject({ modifier: -2, modifierSum: null })
    expect(ok('1d20 – 2').modifier).toBe(-2)
  })

  it('reads an empty text and a lone number as formulas without dice', () => {
    expect(parseFormula('')).toEqual({
      ok: true,
      parts: [{ counts: emptyCounts(), modifier: 0, modifierSum: null }],
    })
    expect(ok('   ').counts).toEqual(emptyCounts())
    expect(ok('5')).toMatchObject({ counts: emptyCounts(), modifier: 5 })
  })

  it('refuses more than sixty physical dice', () => {
    expect(parseFormula('61d6')).toEqual({ ok: false, reason: 'tooMany' })
    expect(parseFormula('31d100')).toEqual({ ok: false, reason: 'tooMany' })
    expect(parseFormula('30d6+31d6')).toEqual({ ok: false, reason: 'tooMany' })
    expect(ok('60d6').counts.d6).toBe(60)
    expect(ok('30d100').counts.d100).toBe(30)
  })

  it('refuses anything else as invalid', () => {
    for (const text of [
      '1d20+4+',
      '1d20+4*2',
      '2d7',
      '-1d4',
      '1d20-1d4',
      '0d6',
      '2d20kh1',
      '1d20+90+20',
      '1d20+150',
      'd',
      '4 4',
      '1 d6',
      'd1000',
      '1d20+1+1+1+1+1+1+1+1+1',
    ]) {
      expect(parseFormula(text), text).toEqual({ ok: false, reason: 'invalid' })
    }
  })

  it('reads its own canonical text back to the same formula', () => {
    for (const text of [
      '40d6+5',
      'D20+4',
      '5+1d20+3',
      ' -2 - 3 + 1d6 ',
      '1d20+5+10-4',
      '1d4+1d6+1d8+1d10+1d12+1d20+1d100-7',
      '5',
      '-2-3',
      '',
      'd20+5;d4+9+d20',
      '2d6; 3d6-1-1; d% ; d20+5+10-4',
    ]) {
      const parts = okParts(text)
      const canonical = formulaPartsText(parts)
      expect(okParts(canonical), `${text} -> ${canonical}`).toEqual(parts)
    }
  })

  it('writes the canonical text with the dice first, and the fixed number alone without dice', () => {
    const write = (text: string) => formulaPartsText(okParts(text))
    expect(write('5+2d6+d20')).toBe('1d20 + 2d6 + 5')
    expect(write('2d6+3d6')).toBe('5d6')
    expect(write('d%')).toBe('1d100')
    expect(write(' -2 - 3 + 1d6 ')).toBe('1d6 − 2 − 3')
    expect(write('5')).toBe('5')
    expect(write('-2-3')).toBe('−2 − 3')
    expect(write('')).toBe('')
  })
})

describe('parseFormula with parts (spec: dice-rolls, "A roll in parts")', () => {
  const okParts = (text: string) => {
    const parsed = parseFormula(text)
    if (!parsed.ok) throw new Error(`${text} refused: ${parsed.reason}`)
    return parsed.parts
  }

  it('reads an attack and its damage as two parts', () => {
    expect(okParts('d20+5;d4+9+d20')).toEqual([
      { counts: counts({ d20: 1 }), modifier: 5, modifierSum: null },
      { counts: counts({ d20: 1, d4: 1 }), modifier: 9, modifierSum: null },
    ])
  })

  it('writes the parts in canonical form, joined by "; "', () => {
    expect(formulaPartsText(okParts('d20+5;d4+9+d20'))).toBe('1d20 + 5; 1d20 + 1d4 + 9')
  })

  it('never adds the same die across parts', () => {
    expect(formulaPartsText(okParts('2d6; 3d6'))).toBe('2d6; 3d6')
  })

  it('reads four parts', () => {
    expect(okParts('d20; d20; d20; d20')).toHaveLength(4)
  })

  it('counts sixty dice across the parts', () => {
    expect(okParts('30d6; 30d6')).toHaveLength(2)
    expect(parseFormula('40d6; 21d6')).toEqual({ ok: false, reason: 'tooMany' })
  })

  it('refuses more than four parts', () => {
    expect(parseFormula('d20; d20; d20; d20; d20')).toEqual({ ok: false, reason: 'tooManyParts' })
  })

  it('reports a part that does not read before the part limit', () => {
    expect(parseFormula('d20; d20; d20; d20; 2d7')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('refuses a part without a die when there are two or more', () => {
    expect(parseFormula('d20+5; 5')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseFormula('5; d20')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('ignores an empty last part', () => {
    expect(okParts('d20+5;')).toEqual([
      { counts: counts({ d20: 1 }), modifier: 5, modifierSum: null },
    ])
    expect(okParts('d20+5;  ')).toHaveLength(1)
    expect(formulaPartsText(okParts('d20+5;'))).toBe('1d20 + 5')
  })

  it('refuses an empty part elsewhere', () => {
    for (const text of ['d20;;d6', ';d20', 'd20;;', 'd20; ;d6']) {
      expect(parseFormula(text), text).toEqual({ ok: false, reason: 'invalid' })
    }
  })

  it("checks each part's numbers on their own", () => {
    expect(okParts('d20+90; d6+90').map((part) => part.modifier)).toEqual([90, 90])
    expect(parseFormula('d20+90; d6+90+20')).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('the sixty dice across parts', () => {
  it('counts the other parts when adding a die', () => {
    // "30d6; 29d6": 59 dice, the last part holds 29.
    expect(canAdd(counts({ d6: 29 }), 'd6', 30)).toBe(true)
    expect(canAdd(counts({ d6: 29 }), 'd100', 30)).toBe(false)
  })

  it("caps a chip's count by the other parts' dice", () => {
    expect(maxCount(counts({ d20: 1, d6: 3 }), 'd6', 40)).toBe(19)
    expect(maxCount(counts({ d6: 1 }), 'd100', 50)).toBe(4)
  })

  it('counts every part', () => {
    expect(
      partsPhysicalCount([onePart(counts({ d20: 1 }), 5), onePart(counts({ d100: 2, d6: 1 }))]),
    ).toBe(6)
  })
})

describe('the parts of a record (design D3 of add-multi-part-rolls)', () => {
  it('reads each part as a span of the dice', () => {
    const dice = rolled(['d20', 14], ['d20', 20], ['d4', 3])
    expect(checkedParts(dice, '1:5;2:9')).toEqual([
      { start: 0, count: 1, modifier: 5, modifierSum: null },
      { start: 1, count: 2, modifier: 9, modifierSum: null },
    ])
  })

  it('keeps a written sum and a part without a fixed number', () => {
    const dice = rolled(['d20', 14], ['d6', 2], ['d6', 5])
    expect(checkedParts(dice, '1:5+10-4;2')).toEqual([
      { start: 0, count: 1, modifier: 11, modifierSum: '5+10-4' },
      { start: 1, count: 2, modifier: 0, modifierSum: null },
    ])
    expect(checkedParts(dice, '1:-3;2')?.[0]).toMatchObject({ modifier: -3, modifierSum: null })
  })

  it('refuses parts that do not fit the dice', () => {
    const dice = rolled(['d20', 14], ['d20', 20], ['d4', 3])
    expect(checkedParts(dice, '3:5')).toBeNull()
    expect(checkedParts(dice, '0;3')).toBeNull()
    expect(checkedParts(dice, '2;2')).toBeNull()
    expect(checkedParts(dice, '1;1;1;0')).toBeNull()
    expect(checkedParts(dice, '1;1;1;1;1')).toBeNull()
    expect(checkedParts(dice, '1:5*2;2')).toBeNull()
    expect(checkedParts(dice, '1:90+20;2')).toBeNull()
    expect(checkedParts(dice, '')).toBeNull()
    expect(checkedParts(dice, null)).toBeNull()
  })

  it('refuses a part that starts on the d10 of a percentile pair', () => {
    const dice = rolled(['d100', 30], ['d10', 7], ['d6', 2])
    expect(checkedParts(dice, '1;2')).toBeNull()
    expect(checkedParts(dice, '2;1')).toHaveLength(2)
  })

  it('writes the parts so that they read back', () => {
    const parts = [
      onePart(counts({ d20: 1 }), 11, '5+10-4'),
      onePart(counts({ d20: 1, d4: 1 }), 9),
      onePart(counts({ d100: 1 }), -2),
      onePart(counts({ d6: 3 })),
    ]
    const text = partsText(parts)
    expect(text).toBe('1:5+10-4;2:9;2:-2;3')
    const dice = parts
      .flatMap((part) => physicalDice(part.counts, 'normal'))
      .map((t) => ({ t, v: 1 }))
    expect(checkedParts(dice, text)).toEqual([
      { start: 0, count: 1, modifier: 11, modifierSum: '5+10-4' },
      { start: 1, count: 2, modifier: 9, modifierSum: null },
      { start: 3, count: 2, modifier: -2, modifierSum: null },
      { start: 5, count: 3, modifier: 0, modifierSum: null },
    ])
  })

  it('writes a fixed number alone when its written sum does not add up', () => {
    expect(partsText([onePart(counts({ d20: 1 }), 7, '5+10-4'), onePart(counts({ d6: 1 }))])).toBe(
      '1:7;1',
    )
  })
})

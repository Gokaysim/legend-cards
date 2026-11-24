// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  EFFECT_TEXT_MAX as APP_TEXT_MAX,
  EFFECT_TYPES as APP_EFFECT_TYPES,
} from '../../src/features/custom-draft/effectTypes.ts'
import { CUSTOM_EFFECT_TYPES, EFFECT_TEXT_MAX, parseCustomEffectFile } from './customEffectRows.ts'
import { DATA_FILES, fixtureFile } from './testData.ts'

const HEADER = 'name,1-cost version,3-cost version,5-cost version'

describe('parseCustomEffectFile', () => {
  it('reads the test file: 18 rows, 53 variants and the empty Draw cell', () => {
    const parsed = parseCustomEffectFile(fixtureFile(DATA_FILES.customEffects))
    expect(parsed.errors).toEqual([])
    expect(parsed.variants).toHaveLength(53)
    expect(parsed.skippedRows).toEqual([])
    expect(parsed.emptyCells).toEqual([{ row: 8, type: 'Draw', cost: 5 }])
  })

  it('matches columns and names without regard to case', () => {
    const parsed = parseCustomEffectFile(
      'NAME,1-COST VERSION,3-Cost Version,5-cost version\ncaster,a,b,c\nTW,d,e,f',
    )
    expect(parsed.variants.map((v) => `${v.type}:${v.cost}:${v.text}`)).toEqual([
      'Caster:1:a',
      'Caster:3:b',
      'Caster:5:c',
      'TW:1:d',
      'TW:3:e',
      'TW:5:f',
    ])
  })

  it('reads "True Word" as TW and "EXP" as XP, in any case', () => {
    const parsed = parseCustomEffectFile(`${HEADER}\nTrue Word,a,b,c\nexp,d,e,f`)
    expect(parsed.skippedRows).toEqual([])
    expect(parsed.variants.map((v) => `${v.type}:${v.cost}`)).toEqual([
      'TW:1',
      'TW:3',
      'TW:5',
      'XP:1',
      'XP:3',
      'XP:5',
    ])
  })

  it('stops on a type written twice, once by its alias', () => {
    const parsed = parseCustomEffectFile(`${HEADER}\nTW,a,b,c\nTrue Word,a,b,c`)
    expect(parsed.errors).toEqual([{ kind: 'duplicate', rows: [2, 3], type: 'TW' }])
  })

  it('skips an unknown row and an empty cell, and names them', () => {
    const parsed = parseCustomEffectFile(`${HEADER}\nLuck,a,b,c\nDraw,a,b,\n,,,`)
    expect(parsed.errors).toEqual([])
    expect(parsed.skippedRows).toEqual([{ row: 2, name: 'Luck' }])
    expect(parsed.emptyCells).toEqual([{ row: 3, type: 'Draw', cost: 5 }])
    expect(parsed.variants).toHaveLength(2)
  })

  it('stops on missing columns, naming them', () => {
    const parsed = parseCustomEffectFile('name,1-cost version,5-cost version\nDraw,a,b')
    expect(parsed.errors).toEqual([{ kind: 'missing-columns', columns: ['3-cost version'] }])
    expect(parsed.variants).toEqual([])
  })

  it('stops on a text over the limit and on a type named twice', () => {
    const long = 'x'.repeat(EFFECT_TEXT_MAX + 1)
    const parsed = parseCustomEffectFile(`${HEADER}\nDraw,${long},b,c\nGold,a,b,c\ngold,a,b,c`)
    expect(parsed.errors).toEqual([
      { kind: 'too-long', row: 2, type: 'Draw', cost: 1, max: EFFECT_TEXT_MAX },
      { kind: 'duplicate', rows: [3, 4], type: 'Gold' },
    ])
  })

  it('reports an unreadable file', () => {
    expect(parseCustomEffectFile('a,"b\n').errors[0]?.kind).toBe('unreadable')
  })
})

describe('drift with the app', () => {
  it('has the same 18 types and text limit as the app', () => {
    expect(CUSTOM_EFFECT_TYPES).toEqual(APP_EFFECT_TYPES)
    expect(EFFECT_TEXT_MAX).toBe(APP_TEXT_MAX)
  })
})

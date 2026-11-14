// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { parseSetFile } from './setRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

const HEADER = 'Code,Name,Aliases,Packs'
const file = (...rows: string[]) => [HEADER, ...rows].join('\n')

describe('parseSetFile: the repository data', () => {
  it('reads data/sets.csv as the 12 sets in shop order, with Pandemonium last and alone in its layout', () => {
    const result = parseSetFile(dataFile('sets.csv'))
    expect(result.errors).toEqual([])
    expect(result.sets.map(({ code, name, packLayout }) => [code, name, packLayout])).toEqual([
      ['The End is Nigh', 'The End is Nigh', 'standard'],
      ['Pentagon', 'Conclave at Pentagon', 'standard'],
      ['Rhodelen', 'Rituals in Rhodelen', 'standard'],
      ['Ashavir', 'The Overlord of Ashavir', 'standard'],
      ['Kesqer', 'Kesqerian Nights', 'standard'],
      ['Godtower', 'The Godtower', 'standard'],
      ['Davarron', 'Descent Under Davarron', 'standard'],
      ['Havenholm', 'Throne of Havenholm', 'standard'],
      ['Ulagal', 'Ballad of Ulagal', 'standard'],
      ['Nordhallr', 'Ragnarök: Nordhallr', 'standard'],
      ['Gurgitea', 'The Lost City of Gurgitea', 'standard'],
      ['Pandemonium', 'Pandemonium', 'pandemonium'],
    ])
  })

  it('reads the aliases from one quoted cell, trimmed', () => {
    const { sets } = parseSetFile(dataFile('sets.csv'))
    expect(sets.find(({ code }) => code === 'The End is Nigh')?.aliases).toEqual(['endisnigh'])
    expect(sets.find(({ code }) => code === 'Nordhallr')?.aliases).toEqual(['ragnarok', 'ragnarök'])
    expect(sets.find(({ code }) => code === 'Kesqer')?.aliases).toEqual([])
  })
})

describe('parseSetFile: values', () => {
  it('trims every value, drops empty aliases, and reads Packs and the headers in any case', () => {
    const result = parseSetFile(
      'code, NAME ,aliases,PACKS\n  Kesqer , Kesqerian Nights ,"  kq ,, kesq nights , ",  Standard ',
    )
    expect(result.errors).toEqual([])
    expect(result.sets).toEqual([
      {
        row: 2,
        code: 'Kesqer',
        name: 'Kesqerian Nights',
        aliases: ['kq', 'kesq nights'],
        packLayout: 'standard',
      },
    ])
  })

  it('skips empty rows', () => {
    const result = parseSetFile(file('Kesqer,Kesqerian Nights,,standard', ',,,', ''))
    expect(result.errors).toEqual([])
    expect(result.sets).toHaveLength(1)
  })
})

describe('parseSetFile: errors, each with its row number', () => {
  it('stops at a missing column', () => {
    expect(parseSetFile('Code,Name\nKesqer,Kesqerian Nights').errors).toEqual([
      { kind: 'missing-columns', columns: ['aliases', 'packs'] },
    ])
  })

  it('stops at an unreadable file', () => {
    expect(parseSetFile(file('Kesqer,"never closed,,standard')).errors).toEqual([
      { kind: 'unreadable', detail: expect.any(String) as string },
    ])
  })

  it('stops at an empty code or name', () => {
    expect(parseSetFile(file(',Kesqerian Nights,,standard', 'Kesqer,,,standard')).errors).toEqual([
      { kind: 'empty-cell', row: 2, column: 'Code' },
      { kind: 'empty-cell', row: 3, column: 'Name' },
    ])
  })

  it('stops at a code or alias without letters or digits', () => {
    expect(
      parseSetFile(file('?!,Nowhere,,standard', 'Kesqer,Kesqerian Nights,—,standard')).errors,
    ).toEqual([
      { kind: 'without-letters', row: 2, field: 'code', value: '?!' },
      { kind: 'without-letters', row: 3, field: 'alias', value: '—' },
    ])
  })

  it('stops at a value longer than 100 characters', () => {
    const long = 'K'.repeat(101)
    expect(
      parseSetFile(
        file(
          `${long},Kesqerian Nights,,standard`,
          `Ulagal,${'B'.repeat(101)},,standard`,
          `Gurgitea,The Lost City of Gurgitea,"gurg, ${'G'.repeat(101)}",standard`,
          `Pentagon,${'P'.repeat(100)},,standard`,
        ),
      ).errors,
    ).toEqual([
      { kind: 'too-long', row: 2, field: 'code', value: long, max: 100 },
      { kind: 'too-long', row: 3, field: 'name', value: 'B'.repeat(101), max: 100 },
      { kind: 'too-long', row: 4, field: 'alias', value: 'G'.repeat(101), max: 100 },
    ])
  })

  it('stops at more than 10 aliases', () => {
    const aliases = (count: number) => Array.from({ length: count }, (_, i) => `k${i}`).join(', ')
    expect(
      parseSetFile(
        file(
          `Kesqer,Kesqerian Nights,"${aliases(10)}",standard`,
          `Ulagal,Ballad of Ulagal,"${aliases(11).replace(/k/g, 'u')}",standard`,
        ),
      ).errors,
    ).toEqual([{ kind: 'too-many-aliases', row: 3, count: 11, max: 10 }])
  })

  it('stops at an unknown or empty Packs value', () => {
    expect(
      parseSetFile(file('Kesqer,Kesqerian Nights,,premium', 'Ulagal,Ballad of Ulagal,,')).errors,
    ).toEqual([
      { kind: 'unknown-packs', row: 2, value: 'premium' },
      { kind: 'unknown-packs', row: 3, value: '' },
    ])
  })

  it('stops at the code Blessed, in any spelling', () => {
    expect(parseSetFile(file('Blessed,Blessed Cards,,standard')).errors).toEqual([
      { kind: 'blessed-code', row: 2 },
    ])
    expect(
      parseSetFile(file('Kesqer,Kesqerian Nights,,standard', ' bless ed ,B,,standard')).errors,
    ).toEqual([{ kind: 'blessed-code', row: 3 }])
  })

  it('stops at two rows for one set, naming both rows', () => {
    const result = parseSetFile(
      file('Kesqer,Kesqerian Nights,,standard', 'kesqer,Kesqer Again,,standard'),
    )
    expect(result.errors).toEqual([
      { kind: 'duplicate', rows: [2, 3], field: 'spelling', value: 'kesqer' },
    ])
    expect(result.sets).toHaveLength(1)
  })

  it("stops at a name another row has, or a spelling among another row's code and aliases", () => {
    expect(
      parseSetFile(
        file(
          'Kesqer,Kesqerian Nights,"kn, nights",standard',
          'Ulagal,Kesqerian  nights,,standard',
          'Nights,Night City,,standard',
          'Gurgitea,The Lost City of Gurgitea,KN,standard',
        ),
      ).errors,
    ).toEqual([
      { kind: 'duplicate', rows: [2, 3], field: 'name', value: 'Kesqerian  nights' },
      { kind: 'duplicate', rows: [2, 4], field: 'spelling', value: 'Nights' },
      { kind: 'duplicate', rows: [2, 5], field: 'spelling', value: 'KN' },
    ])
  })

  it('lets one row spell its own set twice', () => {
    const result = parseSetFile(file('Nordhallr,Ragnarök: Nordhallr,"ragnarok, ragnarök",standard'))
    expect(result.errors).toEqual([])
  })

  it('reports every problem of the file at once', () => {
    expect(
      parseSetFile(file(',,,', 'Blessed,,,cursed', 'Kesqer,Kesqerian Nights,,standard')).errors,
    ).toEqual([
      { kind: 'empty-cell', row: 3, column: 'Name' },
      { kind: 'blessed-code', row: 3 },
      { kind: 'unknown-packs', row: 3, value: 'cursed' },
    ])
  })
})

import { describe, expect, it } from 'vitest'

import { TEST_SETS } from '@/test/setFixtures'

import { parseAliases, setFormProblems } from './validation'

const newSet = (overrides: Partial<Parameters<typeof setFormProblems>[0]> = {}) => ({
  id: null,
  code: 'Zaddir',
  name: 'Tower of Zaddir',
  aliases: [],
  ...overrides,
})

describe('parseAliases', () => {
  it('splits at commas, trims, drops empty ones and repeats', () => {
    expect(parseAliases(' ragnarok, ragnarök ,, ragnarok ')).toEqual(['ragnarok', 'ragnarök'])
    expect(parseAliases('')).toEqual([])
  })
})

describe('setFormProblems', () => {
  it('accepts a new set', () => {
    expect(setFormProblems(newSet(), TEST_SETS)).toEqual([])
  })

  it.each([
    ['an empty code', { code: '' }, 'Set kodu boş olamaz.'],
    ['a code without letters', { code: '—' }, 'Set kodunda en az bir harf ya da rakam olmalı.'],
    ['Blessed', { code: 'blessed' }, '“Blessed” bir set değil: başka bir kod seç.'],
    ['an existing code in another spelling', { code: 'KESQER' }, 'Bu kodla bir set zaten var.'],
    ["another set's alias as the code", { code: 'Ragnarok' }, 'Bu kodla bir set zaten var.'],
    ['an empty name', { name: '' }, 'Set adı boş olamaz.'],
    ["another set's name", { name: 'kesqerian nights' }, 'Bu adla bir set zaten var.'],
    [
      'a name over 100 characters',
      { name: 'x'.repeat(101) },
      'Set adı en fazla 100 karakter olabilir.',
    ],
    [
      "another set's code as an alias",
      { aliases: ['Rhodelen'] },
      'Başka bir set bu yazımı kullanıyor: Rhodelen.',
    ],
    [
      '11 aliases',
      { aliases: Array.from({ length: 11 }, (_, i) => `z${i}`) },
      "Bir setin en fazla 10 alias'ı olabilir.",
    ],
  ])('refuses %s', (_label, overrides, problem) => {
    expect(setFormProblems(newSet(overrides), TEST_SETS)).toContain(problem)
  })

  it('lets a stored set keep its own code, name and aliases', () => {
    const nordhallr = TEST_SETS.find((set) => set.code === 'Nordhallr')
    expect(nordhallr).toBeDefined()
    if (!nordhallr) return
    expect(
      setFormProblems(
        {
          id: nordhallr.id,
          code: nordhallr.code,
          name: nordhallr.name,
          aliases: nordhallr.aliases,
        },
        TEST_SETS,
      ),
    ).toEqual([])
  })
})

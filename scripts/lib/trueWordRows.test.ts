// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { parseTrueWordFile } from './trueWordRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

const HEADER = 'Name,Cost,Text'
const words = (...rows: string[]) => [HEADER, ...rows].join('\n')

describe('parseTrueWordFile: columns', () => {
  it('reports the missing column of a wrong file, such as an Elixir file, and returns no words', () => {
    const result = parseTrueWordFile('Name,Cost,Effect\nHealing Elixir,500,Heal 2d4.')
    expect(result.errors).toEqual([{ kind: 'missing-columns', columns: ['text'] }])
    expect(result.words).toEqual([])
  })

  it('matches column names regardless of case and ignores extra columns', () => {
    const result = parseTrueWordFile('NAME,cost,TEXT,Notes\nAbyss,5,Once per turn.,mine')
    expect(result.errors).toEqual([])
    expect(result.words[0]?.word).toEqual({
      name: 'Abyss',
      nameKey: 'abyss',
      cost: '5',
      text: 'Once per turn.',
    })
  })

  it('trims every value', () => {
    const result = parseTrueWordFile(words('  Aid , 1 ,  Aid Another as a swift action.  '))
    expect(result.words[0]?.word).toEqual({
      name: 'Aid',
      nameKey: 'aid',
      cost: '1',
      text: 'Aid Another as a swift action.',
    })
  })
})

describe('parseTrueWordFile: rows', () => {
  it('keeps the cost as written, X and 0 included', () => {
    const result = parseTrueWordFile(words('Dragon,X,Breathe.', 'Chaos,0,Roll twice.'))
    expect(result.words.map(({ word }) => word.cost)).toEqual(['X', '0'])
  })

  it('reports an empty name with its row number', () => {
    const result = parseTrueWordFile(words('Abyss,5,Free card.', ',1,No name.'))
    expect(result.errors).toEqual([{ kind: 'empty-name', row: 3 }])
  })

  it('reports a name without letters or digits', () => {
    const result = parseTrueWordFile(words('!!!,1,Odd.'))
    expect(result.errors).toEqual([{ kind: 'name-without-letters', row: 2, name: '!!!' }])
  })

  it('reads an empty cost, and a dash, as a missing cost: the word becomes a draft, not an error', () => {
    const result = parseTrueWordFile(words('Abyss,,Free card.', 'Aid,—,Swift aid.'))
    expect(result.errors).toEqual([])
    expect(result.words.map(({ word, missing }) => [word.cost, missing])).toEqual([
      [null, ['cost']],
      [null, ['cost']],
    ])
  })

  it('reports a cost longer than 10 characters', () => {
    const result = parseTrueWordFile(words('Abyss,12345678901,Free card.'))
    expect(result.errors).toEqual([
      { kind: 'too-long', row: 2, name: 'Abyss', field: 'cost', max: 10 },
    ])
  })

  it('reports two rows whose names match after normalizing as a duplicate', () => {
    const result = parseTrueWordFile(words('Ancient Word,1,A.', 'ancient word,2,B.'))
    expect(result.errors).toEqual([{ kind: 'duplicate', rows: [2, 3], name: 'ancient word' }])
    expect(result.words).toHaveLength(1)
  })

  it('reads an empty text, and a dash, as a missing text', () => {
    const result = parseTrueWordFile(words('Abyss,5,', 'Aid,1,—'))
    expect(result.errors).toEqual([])
    expect(result.words.map(({ word, missing }) => [word.text, missing])).toEqual([
      ['', ['text']],
      ['', ['text']],
    ])
  })

  it('misses nothing in a complete row', () => {
    expect(parseTrueWordFile(words('Dragon,X,Breathe.')).words[0]?.missing).toEqual([])
  })

  it('skips fully empty rows', () => {
    const result = parseTrueWordFile(words('Abyss,5,Free card.', ',,', 'Aid,1,Swift.'))
    expect(result.errors).toEqual([])
    expect(result.words.map(({ row }) => row)).toEqual([2, 4])
  })

  it('reads text with commas inside quotes', () => {
    const result = parseTrueWordFile(words('Abyss,5,"Once per turn, a card is free."'))
    expect(result.words[0]?.word.text).toBe('Once per turn, a card is free.')
  })
})

describe('parseTrueWordFile: the repository file', () => {
  it('reads all 53 words without errors, none of them missing a value', () => {
    const result = parseTrueWordFile(dataFile('true-words.csv'))
    expect(result.errors).toEqual([])
    expect(result.words).toHaveLength(53)
    expect(result.words.filter(({ missing }) => missing.length > 0)).toEqual([])
  })
})

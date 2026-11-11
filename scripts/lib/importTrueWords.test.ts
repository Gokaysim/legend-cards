// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  planWordImport,
  type StoredWord,
  trueWordId,
  type WordPlan,
  type WordRow,
} from './importTrueWords.ts'
import type { TrueWordDefinition, WordColumn } from './trueWordRows.ts'

const word = (name: string, nameKey: string, overrides: Partial<TrueWordDefinition> = {}) =>
  ({ name, nameKey, cost: '1', text: 'Text.', ...overrides }) satisfies TrueWordDefinition

/** A file row: complete unless `missing` names empty columns. */
const row = (definition: TrueWordDefinition, missing: WordColumn[] = []): WordRow => ({
  word: definition,
  missing,
})

const stored = (
  definition: TrueWordDefinition,
  extra: Record<string, unknown> = {},
): StoredWord => ({
  id: trueWordId(definition.nameKey),
  data: { ...definition, status: 'active', ...extra },
})

const outcomes = (plan: WordPlan) => plan.words.map((planned) => [planned.id, planned.outcome])

describe('trueWordId', () => {
  it('prefixes the normalized name with tw-', () => {
    expect(trueWordId('ancientword')).toBe('tw-ancientword')
  })
})

describe('planWordImport', () => {
  const abyss = word('Abyss', 'abyss', { cost: '5' })
  const aid = word('Aid', 'aid')

  it('adds a complete word that is not stored as active', () => {
    const plan = planWordImport([], [row(abyss)])
    expect(plan.words).toEqual([
      { id: 'tw-abyss', name: 'Abyss', outcome: 'added-active', missing: [], definition: abyss },
    ])
    expect(plan.counts).toEqual({ 'added-active': 1, 'added-draft': 0, existing: 0 })
  })

  it('adds a word with an empty cost or text as a draft', () => {
    const plan = planWordImport(
      [],
      [row(word('Echo', 'echo', { cost: null, text: '' }), ['cost', 'text'])],
    )
    expect(plan.words[0]).toMatchObject({ outcome: 'added-draft', missing: ['cost', 'text'] })
  })

  it('leaves a stored word alone, even when its cost changed in the file', () => {
    const plan = planWordImport(
      [stored(abyss), stored(aid)],
      [row({ ...abyss, cost: 'X' }), row(aid)],
    )
    expect(outcomes(plan)).toEqual([
      ['tw-abyss', 'existing'],
      ['tw-aid', 'existing'],
    ])
    expect(plan.words[0]?.definition).toBeNull()
  })

  it('never retires a stored word the file no longer has, and leaves a renamed word alone', () => {
    // A renamed word keeps the ID its first name gave it.
    const renamed: StoredWord = {
      id: 'tw-abyss',
      data: { ...abyss, name: 'The Abyss', nameKey: 'theabyss', status: 'retired' },
    }
    const plan = planWordImport([renamed, stored(aid)], [row(abyss)])
    expect(outcomes(plan)).toEqual([['tw-abyss', 'existing']])
  })

  it('gives stored words without a status one, from their old retired flag', () => {
    const plan = planWordImport(
      [
        { id: 'tw-abyss', data: { ...abyss, retired: true } },
        { id: 'tw-aid', data: { ...aid, retired: false } },
        stored(word('Bind', 'bind')),
      ],
      [],
    )
    expect(plan.upgrades).toEqual([
      { id: 'tw-abyss', status: 'retired' },
      { id: 'tw-aid', status: 'active' },
    ])
  })
})

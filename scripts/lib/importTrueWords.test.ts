// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { planWordImport, type StoredWord, trueWordId, type WordPlan } from './importTrueWords.ts'
import type { TrueWordDefinition } from './trueWordRows.ts'

const word = (name: string, nameKey: string, overrides: Partial<TrueWordDefinition> = {}) =>
  ({ name, nameKey, cost: '1', text: 'Text.', ...overrides }) satisfies TrueWordDefinition

const stored = (
  definition: TrueWordDefinition,
  extra: Record<string, unknown> = {},
): StoredWord => ({
  id: trueWordId(definition.nameKey),
  data: { ...definition, retired: false, ...extra },
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

  it('adds a word that is not stored, writing its definition as active', () => {
    const plan = planWordImport([], [abyss])
    expect(plan.words).toEqual([
      { id: 'tw-abyss', name: 'Abyss', outcome: 'added', write: { ...abyss, retired: false } },
    ])
    expect(plan.counts).toEqual({ added: 1, updated: 0, unchanged: 0, retired: 0, restored: 0 })
  })

  it('writes nothing for a word that is the same', () => {
    const plan = planWordImport([stored(abyss)], [abyss])
    expect(plan.words).toEqual([
      { id: 'tw-abyss', name: 'Abyss', outcome: 'unchanged', write: null },
    ])
  })

  it('updates a word whose cost or text changed, keeping its identity', () => {
    const plan = planWordImport([stored(abyss), stored(aid)], [{ ...abyss, cost: 'X' }, aid])
    expect(outcomes(plan)).toEqual([
      ['tw-abyss', 'updated'],
      ['tw-aid', 'unchanged'],
    ])
    expect(plan.words[0]?.write).toEqual({ ...abyss, cost: 'X', retired: false })
  })

  it('updates a stored word without the retired flag', () => {
    const plan = planWordImport([{ id: 'tw-abyss', data: { ...abyss } }], [abyss])
    expect(outcomes(plan)).toEqual([['tw-abyss', 'updated']])
  })

  it('retires a stored word that the file no longer has, writing only the flag', () => {
    const plan = planWordImport([stored(abyss), stored(aid)], [aid])
    expect(plan.words).toContainEqual({
      id: 'tw-abyss',
      name: 'Abyss',
      outcome: 'retired',
      write: { retired: true },
    })
    expect(plan.counts.retired).toBe(1)
  })

  it('leaves an already retired word alone', () => {
    const plan = planWordImport([stored(abyss, { retired: true }), stored(aid)], [aid])
    expect(outcomes(plan)).toEqual([['tw-aid', 'unchanged']])
  })

  it('brings back a retired word that is in the file again', () => {
    const plan = planWordImport([stored(abyss, { retired: true })], [abyss])
    expect(plan.words).toEqual([
      { id: 'tw-abyss', name: 'Abyss', outcome: 'restored', write: { ...abyss, retired: false } },
    ])
  })

  it('never writes fields other than the definition and the retired flag', () => {
    const plan = planWordImport([stored(abyss, { extra: 'kept' })], [{ ...abyss, text: 'New.' }])
    expect(plan.words[0]?.write).not.toHaveProperty('extra')
  })
})

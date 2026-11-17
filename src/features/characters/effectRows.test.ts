import { describe, expect, it } from 'vitest'

import { testCharacter, testEffect } from '@/test/characterFixtures'

import { effectKind, effectRows } from './effectRows'
import type { HeldEffect } from './heldEffects'

describe('effectKind', () => {
  it.each([
    ['a Cursed card', { source: 'card', cursed: true, blessed: false }, 'cursed'],
    ['a Blessed card', { source: 'card', cursed: false, blessed: true }, 'blessed'],
    ['a True Word', { source: 'word', cursed: false, blessed: false }, 'word'],
    ['another card', { source: 'card', cursed: false, blessed: false }, 'card'],
    ['an own effect', { source: 'own', cursed: false, blessed: false }, 'custom'],
    ['a DM effect', { source: 'dm', cursed: false, blessed: false }, 'custom'],
  ] as const)('gives %s its kind', (_case, effect, kind) => {
    expect(effectKind(effect)).toBe(kind)
  })
})

describe('effectRows', () => {
  const thorin = testCharacter('Thorin', 'ayla')
  const held = (overrides: Partial<HeldEffect>): HeldEffect => ({
    id: 'h1',
    kind: 'held',
    name: 'Held card',
    text: 'Held text.',
    cursed: false,
    blessed: false,
    ...overrides,
  })

  it('lists the held effects, then the stored ones, with their marks and kinds', () => {
    const rows = effectRows(
      [
        held({ id: 'h1', name: 'Spellbound', cursed: true }),
        held({ id: 'h2', name: 'Second Wind', blessed: true }),
        held({ id: 'h3', name: "Crowe's Magical Mayhem" }),
        held({ id: 'r1', kind: 'word', name: 'Dragon' }),
      ],
      [
        testEffect('Kutsal kalkan', thorin, { source: 'dm', createdBy: 'dana' }),
        testEffect('Gizlenme', thorin),
        testEffect('Lucky Coin', thorin, { source: 'card', sourceId: 'u1' }),
      ],
    )

    expect(rows.map(({ name, mark, kind, isEnglish }) => [name, mark, kind, isEnglish])).toEqual([
      ['Spellbound', 'Elden', 'cursed', true],
      ['Second Wind', 'Elden', 'blessed', true],
      ["Crowe's Magical Mayhem", 'Elden', 'card', true],
      ['Dragon', 'True Word', 'word', true],
      ['Kutsal kalkan', 'DM', 'custom', false],
      ['Gizlenme', 'Özel', 'custom', false],
      ['Lucky Coin', 'Kart', 'card', true],
    ])
    expect(rows.slice(0, 4).every((row) => row.stored === null)).toBe(true)
  })

  it('shows an effect stored from a Blessed card before the Blessed mark as a card', () => {
    const [row] = effectRows(
      [],
      [testEffect('Second Wind', thorin, { source: 'card', sourceId: 'h9' })],
    )
    expect(row).toMatchObject({ mark: 'Kart', kind: 'card' })
  })
})

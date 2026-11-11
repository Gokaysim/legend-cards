// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { CardColumn, CardDefinition } from './cardRows.ts'
import {
  cardId,
  type CardRow,
  type ImportPlan,
  planImport,
  type StoredCard,
  upgradeOf,
} from './importCards.ts'

const normalCard = (name: string, nameKey: string, overrides: Partial<CardDefinition> = {}) =>
  ({
    kind: 'normal',
    name,
    nameKey,
    setCode: 'Kesqer',
    cost: '1',
    rarity: 'common',
    mechanicPack: 'Permamancy',
    text: 'Text.',
    ...overrides,
  }) satisfies CardDefinition

const cursedCard = (name: string, nameKey: string): CardDefinition => ({
  kind: 'cursed',
  name,
  nameKey,
  setCode: null,
  cost: '1',
  rarity: null,
  mechanicPack: null,
  text: 'Bad.',
})

/** A file row: complete unless `missing` names empty columns. */
const row = (card: CardDefinition, missing: CardColumn[] = []): CardRow => ({ card, missing })

const stored = (
  id: string,
  card: CardDefinition,
  extra: Record<string, unknown> = {},
): StoredCard => ({
  id,
  data: { ...card, status: 'active', ...extra },
})

const outcomes = (plan: ImportPlan) =>
  plan.flatMap((deck) => deck.cards.map((card) => [card.id, card.outcome]))

describe('cardId', () => {
  it('joins the deck and the normalized name', () => {
    expect(cardId('legend', 'abolethseyes')).toBe('legend-abolethseyes')
    expect(cardId('cursed', 'visionsofdeath')).toBe('cursed-visionsofdeath')
  })
})

describe('planImport', () => {
  const eyes = normalCard("Aboleth's Eyes", 'abolethseyes')

  it('adds a complete card that is not stored as active', () => {
    const [deck] = planImport([], { legend: [row(eyes)] })
    expect(deck?.cards).toEqual([
      {
        id: 'legend-abolethseyes',
        name: "Aboleth's Eyes",
        outcome: 'added-active',
        missing: [],
        definition: eyes,
      },
    ])
    expect(deck?.counts).toEqual({ 'added-active': 1, 'added-draft': 0, existing: 0 })
    expect(deck?.upgrades).toEqual([])
  })

  it('adds a card with an empty column as a draft, naming the column', () => {
    const finale = normalCard('The Grand Finale', 'thegrandfinale', { cost: null })
    const [deck] = planImport([], { legend: [row(finale, ['cost'])] })
    expect(deck?.cards[0]).toMatchObject({ outcome: 'added-draft', missing: ['cost'] })
  })

  it('leaves a stored card alone, even when the file changed it', () => {
    const changed = { ...eyes, text: 'New text.' }
    const [deck] = planImport([stored('legend-abolethseyes', eyes)], { legend: [row(changed)] })
    expect(deck?.cards).toEqual([
      {
        id: 'legend-abolethseyes',
        name: "Aboleth's Eyes",
        outcome: 'existing',
        missing: [],
        definition: null,
      },
    ])
  })

  it('leaves a stored card alone whatever its status', () => {
    const plan = planImport(
      [
        stored('legend-abolethseyes', eyes, { status: 'retired' }),
        stored('legend-echo', normalCard('Echo', 'echo'), { status: 'draft' }),
      ],
      { legend: [row(eyes), row(normalCard('Echo', 'echo'))] },
    )
    expect(outcomes(plan)).toEqual([
      ['legend-abolethseyes', 'existing'],
      ['legend-echo', 'existing'],
    ])
  })

  it('does not add a card again that the DM renamed, nor one stored under another ID with its name', () => {
    const renamed = { ...eyes, name: 'Eyes of the Aboleth', nameKey: 'eyesoftheaboleth' }
    const suffixed = normalCard('Bard Song', 'bardsong')
    const plan = planImport(
      [stored('legend-abolethseyes', renamed), stored('legend-bardsong-2', suffixed)],
      { legend: [row(eyes), row(suffixed)] },
    )
    expect(outcomes(plan)).toEqual([
      ['legend-abolethseyes', 'existing'],
      ['legend-bardsong', 'existing'],
    ])
  })

  it('never retires a stored card the file no longer has', () => {
    const [deck] = planImport([stored('legend-abolethseyes', eyes)], { legend: [] })
    expect(deck?.cards).toEqual([])
  })

  it('gives stored cards without a status one, from their old retired flag', () => {
    const hex = cursedCard('Hex', 'hex')
    const { status: _none, ...old } = stored('legend-abolethseyes', eyes).data
    const plan = planImport(
      [
        { id: 'legend-abolethseyes', data: { ...old, retired: false } },
        { id: 'legend-gone', data: { ...old, nameKey: 'gone', retired: true } },
        stored('legend-new', normalCard('New', 'new')),
        { id: 'cursed-hex', data: { ...hex, retired: true } },
      ],
      { legend: [row(eyes)] },
    )
    expect(plan.map((deck) => deck.upgrades)).toEqual([
      [
        { id: 'legend-abolethseyes', status: 'active' },
        { id: 'legend-gone', status: 'retired' },
      ],
    ])
  })

  it('plans only the imported decks and never touches the other one', () => {
    const hex = cursedCard('Hex', 'hex')
    const existing = [stored('legend-abolethseyes', eyes), stored('cursed-hex', hex)]

    const plan = planImport(existing, { cursed: [row(hex)] })

    expect(plan.map((deck) => deck.deck)).toEqual(['cursed'])
    expect(outcomes(plan)).toEqual([['cursed-hex', 'existing']])
  })

  it('keeps a Legend card and a Cursed card with the same name apart', () => {
    const plan = planImport([stored('legend-echo', normalCard('Echo', 'echo'))], {
      legend: [row(normalCard('Echo', 'echo'))],
      cursed: [row(cursedCard('Echo', 'echo'))],
    })
    expect(outcomes(plan)).toEqual([
      ['legend-echo', 'existing'],
      ['cursed-echo', 'added-active'],
    ])
  })

  it('ignores stored documents whose ID belongs to no deck', () => {
    const plan = planImport([{ id: 'stray', data: { retired: false } }], { legend: [] })
    expect(outcomes(plan)).toEqual([])
    expect(plan[0]?.upgrades).toEqual([])
  })

  it('counts every outcome', () => {
    const kept = normalCard('Kept', 'kept')
    const [deck] = planImport([stored('legend-kept', kept)], {
      legend: [
        row(kept),
        row(normalCard('New', 'new')),
        row(normalCard('Draft', 'draft', { text: '' }), ['text']),
      ],
    })
    expect(deck?.counts).toEqual({ 'added-active': 1, 'added-draft': 1, existing: 1 })
  })
})

describe('upgradeOf', () => {
  it('upgrades only a definition without a status', () => {
    expect(upgradeOf({ id: 'a', data: { retired: true } })).toEqual({ id: 'a', status: 'retired' })
    expect(upgradeOf({ id: 'b', data: {} })).toEqual({ id: 'b', status: 'active' })
    expect(upgradeOf({ id: 'c', data: { status: 'draft' } })).toBeNull()
  })
})

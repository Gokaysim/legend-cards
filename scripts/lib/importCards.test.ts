// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { CardDefinition } from './cardRows.ts'
import { cardId, type ImportPlan, planImport, type StoredCard } from './importCards.ts'

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

const stored = (
  id: string,
  card: CardDefinition,
  extra: Record<string, unknown> = {},
): StoredCard => ({
  id,
  data: { ...card, retired: false, ...extra },
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

  it('adds a card that is not stored, writing its definition as active', () => {
    const [deck] = planImport([], { legend: [eyes] })
    expect(deck?.cards).toEqual([
      {
        id: 'legend-abolethseyes',
        name: "Aboleth's Eyes",
        outcome: 'added',
        write: { ...eyes, retired: false },
      },
    ])
    expect(deck?.counts).toEqual({ added: 1, updated: 0, unchanged: 0, retired: 0, restored: 0 })
  })

  it('writes nothing for a card that is the same', () => {
    const [deck] = planImport([stored('legend-abolethseyes', eyes)], { legend: [eyes] })
    expect(deck?.cards).toEqual([
      { id: 'legend-abolethseyes', name: "Aboleth's Eyes", outcome: 'unchanged', write: null },
    ])
  })

  it('ignores fields the import does not own, such as a holder', () => {
    const plan = planImport(
      [
        stored('legend-abolethseyes', eyes, {
          holder: { uid: 'u1', userCardId: 'h1' },
          imageUrl: 'x',
        }),
      ],
      { legend: [eyes] },
    )
    expect(outcomes(plan)).toEqual([['legend-abolethseyes', 'unchanged']])
  })

  it('updates a card whose definition differs, never writing other fields', () => {
    const changed = { ...eyes, text: 'New text.' }
    const [deck] = planImport([stored('legend-abolethseyes', eyes, { holder: null })], {
      legend: [changed],
    })
    expect(deck?.cards[0]).toEqual({
      id: 'legend-abolethseyes',
      name: "Aboleth's Eyes",
      outcome: 'updated',
      write: { ...changed, retired: false },
    })
  })

  it('updates the same card when the name differs only in punctuation', () => {
    const renamed = normalCard('Aboleths Eyes', 'abolethseyes')
    const plan = planImport([stored('legend-abolethseyes', eyes)], { legend: [renamed] })
    expect(outcomes(plan)).toEqual([['legend-abolethseyes', 'updated']])
  })

  it('updates a card whose stored document lacks a definition field', () => {
    const { mechanicPack: _dropped, ...partial } = eyes
    const plan = planImport([{ id: 'legend-abolethseyes', data: { ...partial, retired: false } }], {
      legend: [eyes],
    })
    expect(outcomes(plan)).toEqual([['legend-abolethseyes', 'updated']])
  })

  it('updates a card that moves from normal to Blessed, under the same ID', () => {
    const blessed = { ...eyes, kind: 'blessed' as const, setCode: null, rarity: null, cost: null }
    const plan = planImport([stored('legend-abolethseyes', eyes)], { legend: [blessed] })
    expect(outcomes(plan)).toEqual([['legend-abolethseyes', 'updated']])
  })

  it('retires a stored card of the deck that the file no longer has', () => {
    const [deck] = planImport([stored('legend-abolethseyes', eyes)], { legend: [] })
    expect(deck?.cards).toEqual([
      {
        id: 'legend-abolethseyes',
        name: "Aboleth's Eyes",
        outcome: 'retired',
        write: { retired: true },
      },
    ])
  })

  it('leaves an already retired card alone when it is still missing', () => {
    const [deck] = planImport([stored('legend-abolethseyes', eyes, { retired: true })], {
      legend: [],
    })
    expect(deck?.cards).toEqual([])
  })

  it('restores a retired card that is back in the file, with the definition from the file', () => {
    const changed = { ...eyes, text: 'Back again.' }
    const [deck] = planImport([stored('legend-abolethseyes', eyes, { retired: true })], {
      legend: [changed],
    })
    expect(deck?.cards).toEqual([
      {
        id: 'legend-abolethseyes',
        name: "Aboleth's Eyes",
        outcome: 'restored',
        write: { ...changed, retired: false },
      },
    ])
  })

  it('plans only the imported decks and never touches the other one', () => {
    const hex = cursedCard('Hex', 'hex')
    const existing = [stored('legend-abolethseyes', eyes), stored('cursed-hex', hex)]

    const plan = planImport(existing, { cursed: [] })

    expect(plan.map((deck) => deck.deck)).toEqual(['cursed'])
    expect(outcomes(plan)).toEqual([['cursed-hex', 'retired']])
  })

  it('keeps a Legend card and a Cursed card with the same name apart', () => {
    const plan = planImport([], {
      legend: [normalCard('Echo', 'echo')],
      cursed: [cursedCard('Echo', 'echo')],
    })
    expect(outcomes(plan)).toEqual([
      ['legend-echo', 'added'],
      ['cursed-echo', 'added'],
    ])
  })

  it('ignores stored documents whose ID belongs to no deck', () => {
    const plan = planImport([{ id: 'stray', data: { retired: false } }], { legend: [] })
    expect(outcomes(plan)).toEqual([])
  })

  it('counts every outcome', () => {
    const kept = normalCard('Kept', 'kept')
    const changed = normalCard('Changed', 'changed')
    const gone = normalCard('Gone', 'gone')
    const back = normalCard('Back', 'back')
    const [deck] = planImport(
      [
        stored('legend-kept', kept),
        stored('legend-changed', changed),
        stored('legend-gone', gone),
        stored('legend-back', back, { retired: true }),
      ],
      { legend: [kept, { ...changed, cost: '2' }, back, normalCard('New', 'new')] },
    )
    expect(deck?.counts).toEqual({ added: 1, updated: 1, unchanged: 1, retired: 1, restored: 1 })
  })
})

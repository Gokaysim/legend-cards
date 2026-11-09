import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { RandomSource } from '@/lib/random'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import type { PackDef } from './catalog'
import { buildPack } from './contents'

/** A deterministic source of 32-bit numbers (mulberry32), so each seed gives one fixed pack. */
function seeded(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return (value ^ (value >>> 14)) >>> 0
  }
}

const SEEDS = Array.from({ length: 300 }, (_, seed) => seed)

function cardsOf(
  prefix: string,
  count: number,
  overrides: Parameters<typeof testCard>[1] = {},
): Card[] {
  return Array.from({ length: count }, (_, index) => testCard(`${prefix} ${index + 1}`, overrides))
}

const def = (type: PackDef['type'], scope: Partial<PackDef> = {}): PackDef => ({
  key: type,
  type,
  setCode: null,
  mechanicPack: null,
  ...scope,
})

const kesqerCommons = cardsOf('K', 10)
const kesqerRares = cardsOf('KR', 3, { rarity: 'rare' })
const pandemoniumRares = cardsOf('P', 9, { setCode: 'Pandemonium', rarity: 'rare' })
const otherRares = cardsOf('R', 40, { setCode: 'Havenholm', rarity: 'rare' })
const blessed = [
  testBlessedCard('Second Wind', { mechanicPack: 'Blood & Battle' }),
  testBlessedCard('Fresh Start', { mechanicPack: 'Risk & Reward' }),
]
const bloodBattle = cardsOf('B', 28, { setCode: 'Havenholm', mechanicPack: 'Blood & Battle' })
const curses = [testCursedCard('Visions of Death'), testCursedCard('Bad Omen')]
const heldCard = testCard('Held Card', { holder: { uid: 'bora', userCardId: 'h-1' } })
const retiredCard = testCard('Retired Card', { retired: true })

const CARDS: Card[] = [
  ...kesqerCommons,
  ...kesqerRares,
  ...pandemoniumRares,
  ...otherRares,
  ...blessed,
  ...bloodBattle,
  ...curses,
  heldCard,
  retiredCard,
]
const byId = new Map(CARDS.map((card) => [card.id, card]))
const cardsIn = (ids: string[] | null) => (ids ?? []).map((id) => byId.get(id) as Card)

const PACKS: [PackDef, number][] = [
  [def('standard', { setCode: 'Kesqer' }), 5],
  [def('premium', { setCode: 'Kesqer' }), 5],
  [def('cursed', { setCode: 'Kesqer' }), 6],
  [def('pandemonium', { setCode: 'Pandemonium' }), 5],
  [def('pandemoniumCursed', { setCode: 'Pandemonium' }), 6],
  [def('mechanic', { mechanicPack: 'Blood & Battle' }), 5],
  [def('golden'), 5],
  [def('cursedGolden'), 6],
]

describe('buildPack', () => {
  it.each(PACKS)('shows the right number of distinct pool cards in a %s pack', (pack, size) => {
    for (const seed of SEEDS.slice(0, 50)) {
      const shown = buildPack(pack, CARDS, seeded(seed))
      expect(shown).toHaveLength(size)
      expect(new Set(shown).size).toBe(size)
      for (const card of cardsIn(shown)) {
        expect(card.retired).toBe(false)
        expect(card.kind === 'normal' ? card.holder : null).toBeNull()
      }
    }
  })

  it('shows a Rare first-slot card in every Premium Pack', () => {
    for (const seed of SEEDS) {
      const shown = cardsIn(buildPack(def('premium', { setCode: 'Kesqer' }), CARDS, seeded(seed)))
      expect(shown.some((card) => card.rarity === 'rare')).toBe(true)
      expect(shown.every((card) => card.setCode === 'Kesqer')).toBe(true)
    }
  })

  it('adds exactly one Cursed card to the Cursed types, and only Commons of the set to a Cursed Pack', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      for (const [pack] of PACKS) {
        const shown = cardsIn(buildPack(pack, CARDS, seeded(seed)))
        const cursedCount = shown.filter((card) => card.kind === 'cursed').length
        expect(cursedCount).toBe(pack.type.toLowerCase().includes('cursed') ? 1 : 0)
      }
      const cursedPack = cardsIn(
        buildPack(def('cursed', { setCode: 'Kesqer' }), CARDS, seeded(seed)),
      )
      for (const card of cursedPack.filter((card) => card.kind !== 'cursed')) {
        expect(card).toMatchObject({ setCode: 'Kesqer', rarity: 'common' })
      }
    }
  })

  it('can show a Blessed card in the rare packs, and never in a set pack', () => {
    const showsBlessed = (pack: PackDef) =>
      SEEDS.some((seed) =>
        cardsIn(buildPack(pack, CARDS, seeded(seed))).some((card) => card.kind === 'blessed'),
      )
    expect(showsBlessed(def('pandemonium', { setCode: 'Pandemonium' }))).toBe(true)
    expect(showsBlessed(def('pandemoniumCursed', { setCode: 'Pandemonium' }))).toBe(true)
    expect(showsBlessed(def('golden'))).toBe(true)
    expect(showsBlessed(def('cursedGolden'))).toBe(true)
    expect(showsBlessed(def('standard', { setCode: 'Kesqer' }))).toBe(false)
    expect(showsBlessed(def('premium', { setCode: 'Kesqer' }))).toBe(false)
  })

  it('shows only Pandemonium Rares and Blessed cards in a Pandemonium Pack', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const shown = cardsIn(
        buildPack(def('pandemonium', { setCode: 'Pandemonium' }), CARDS, seeded(seed)),
      )
      for (const card of shown) {
        expect(
          card.kind === 'blessed' || (card.setCode === 'Pandemonium' && card.rarity === 'rare'),
        ).toBe(true)
      }
    }
  })

  it("shows only the mechanic pack's cards in a Mechanic Pack, its Blessed card included", () => {
    const pack = def('mechanic', { mechanicPack: 'Blood & Battle' })
    const seen = new Set<string>()
    for (const seed of SEEDS) {
      for (const card of cardsIn(buildPack(pack, CARDS, seeded(seed)))) {
        expect(card.mechanicPack).toBe('Blood & Battle')
        seen.add(card.id)
      }
    }
    expect(seen.has(blessed[0]?.id ?? '')).toBe(true)
  })

  it('can show every candidate of a pack', () => {
    const pack = def('standard', { setCode: 'Kesqer' })
    const seen = new Set<string>()
    for (const seed of SEEDS)
      for (const id of buildPack(pack, CARDS, seeded(seed)) ?? []) seen.add(id)
    expect(seen).toEqual(new Set([...kesqerCommons, ...kesqerRares].map((card) => card.id)))
  })

  it('gives null when the pool no longer has enough cards', () => {
    expect(buildPack(def('standard', { setCode: 'Kesqer' }), kesqerCommons.slice(0, 8))).toBeNull()
    expect(buildPack(def('cursed', { setCode: 'Kesqer' }), kesqerCommons)).toBeNull()
  })
})

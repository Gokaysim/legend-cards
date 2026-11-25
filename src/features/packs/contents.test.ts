import { describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { RandomSource } from '@/lib/random'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import type { PackDef } from './catalog'
import { BLESSED_ODDS, buildPack } from './contents'

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

/**
 * Answers `script` first, then the numbers of `seeded(seed)`. The first answers decide a pack's Blessed rolls, one per
 * card: `HIT` rolls Blessed, `MISS` does not.
 */
function scripted(script: readonly number[], seed = 0): RandomSource {
  const rest = seeded(seed)
  let index = 0
  return () => script[index++] ?? rest()
}

const HIT = 0
const MISS = 1

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
const retiredCard = testCard('Retired Card', { status: 'retired' })

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
        expect(card.status).toBe('active')
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

  it('shows no Blessed card when no card rolls Blessed, even with Blessed candidates', () => {
    for (const pack of [
      def('pandemonium', { setCode: 'Pandemonium' }),
      def('golden'),
      def('mechanic', { mechanicPack: 'Blood & Battle' }),
    ]) {
      for (const seed of SEEDS.slice(0, 20)) {
        const shown = cardsIn(
          buildPack(pack, CARDS, scripted([MISS, MISS, MISS, MISS, MISS], seed)),
        )
        expect(shown).toHaveLength(5)
        expect(shown.some((card) => card.kind === 'blessed')).toBe(false)
      }
    }
  })

  it('shows one Blessed card for each card that rolls Blessed, never the same one twice', () => {
    const golden = def('golden')
    const blessedIn = (script: number[]) =>
      cardsIn(buildPack(golden, CARDS, scripted(script))).filter((card) => card.kind === 'blessed')
    expect(blessedIn([HIT, MISS, MISS, MISS, MISS])).toHaveLength(1)
    const two = blessedIn([MISS, HIT, MISS, HIT, MISS])
    expect(new Set(two.map((card) => card.id))).toEqual(new Set(blessed.map((card) => card.id)))
    expect(blessedIn([HIT, HIT, HIT, MISS, MISS])).toHaveLength(2)
  })

  it('gives an ordinary card for a Blessed roll when no Blessed card is left', () => {
    const withoutBlessed = CARDS.filter((card) => card.kind !== 'blessed')
    const shown = cardsIn(
      buildPack(def('golden'), withoutBlessed, scripted([HIT, HIT, HIT, HIT, HIT])),
    )
    expect(shown).toHaveLength(5)
    expect(shown.every((card) => card.kind === 'normal' && card.rarity === 'rare')).toBe(true)
    const pandemonium = cardsIn(
      buildPack(
        def('pandemonium', { setCode: 'Pandemonium' }),
        withoutBlessed,
        scripted([HIT, MISS, MISS, MISS, MISS]),
      ),
    )
    expect(pandemonium.every((card) => card.setCode === 'Pandemonium')).toBe(true)
  })

  it("gives a Mechanic Pack's Blessed roll only its own mechanic's Blessed card", () => {
    const pack = def('mechanic', { mechanicPack: 'Blood & Battle' })
    for (const seed of SEEDS.slice(0, 20)) {
      const shown = cardsIn(buildPack(pack, CARDS, scripted([HIT, HIT, HIT, HIT, HIT], seed)))
      expect(shown).toHaveLength(5)
      expect(shown.filter((card) => card.kind === 'blessed').map((card) => card.name)).toEqual([
        'Second Wind',
      ])
      expect(shown.every((card) => card.mechanicPack === 'Blood & Battle')).toBe(true)
    }
  })

  it('never shows a Blessed card in a Cursed type or a set pack', () => {
    const alwaysZero: RandomSource = () => 0
    for (const pack of [
      def('pandemoniumCursed', { setCode: 'Pandemonium' }),
      def('cursedGolden'),
      def('standard', { setCode: 'Kesqer' }),
      def('premium', { setCode: 'Kesqer' }),
      def('cursed', { setCode: 'Kesqer' }),
    ]) {
      for (const random of [alwaysZero, ...SEEDS.map(seeded)]) {
        const shown = cardsIn(buildPack(pack, CARDS, random))
        expect(shown.some((card) => card.kind === 'blessed')).toBe(false)
      }
    }
  })

  it('shows only Pandemonium Rares and Blessed cards in a Pandemonium Pack', () => {
    const pack = def('pandemonium', { setCode: 'Pandemonium' })
    for (const seed of SEEDS.slice(0, 50)) {
      for (const random of [seeded(seed), scripted([HIT, MISS, HIT, MISS, MISS], seed)]) {
        for (const card of cardsIn(buildPack(pack, CARDS, random))) {
          expect(
            card.kind === 'blessed' || (card.setCode === 'Pandemonium' && card.rarity === 'rare'),
          ).toBe(true)
        }
      }
    }
  })

  it("shows only the mechanic pack's cards in a Mechanic Pack", () => {
    const pack = def('mechanic', { mechanicPack: 'Blood & Battle' })
    for (const seed of SEEDS) {
      for (const card of cardsIn(buildPack(pack, CARDS, seeded(seed)))) {
        expect(card.mechanicPack).toBe('Blood & Battle')
      }
    }
  })

  it('makes about 2% of the cards of many Golden Packs Blessed', () => {
    const random = seeded(2026)
    const packs = 10_000
    let blessedShown = 0
    for (let pack = 0; pack < packs; pack += 1) {
      const shown = cardsIn(buildPack(def('golden'), CARDS, random))
      blessedShown += shown.filter((card) => card.kind === 'blessed').length
    }
    const share = blessedShown / (packs * 5)
    expect(1 / BLESSED_ODDS).toBe(0.02)
    expect(share).toBeGreaterThan(0.016)
    expect(share).toBeLessThan(0.024)
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

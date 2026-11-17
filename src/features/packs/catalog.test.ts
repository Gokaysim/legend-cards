import { describe, expect, it } from 'vitest'

import { artLookup } from '@/features/art/artContext'
import type { Card } from '@/features/cards/schema'
import { testArt } from '@/test/artFixtures'
import { PACK_TYPES } from '@/features/draws/schema'
import { setIndex } from '@/features/sets/index'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { TEST_SETS, testSet, testSetName } from '@/test/setFixtures'

import {
  burstArtUrl,
  GOLDEN_PACKS,
  groupArtUrl,
  PACK_PRICES,
  type PackDef,
  packCatalog as catalogOf,
  packDefOf,
  packPools,
  packShortName as shortNameOf,
  packStatus as statusOf,
  packTitle as titleOf,
  priceLabel,
  packCardBack,
  spreadBackOf,
} from './catalog'

const SETS = setIndex(TEST_SETS)
const packCatalog = (cards: readonly Card[], sets = SETS) => catalogOf(cards, sets)
const packTitle = (def: PackDef) => titleOf(def, testSetName)
const packStatus = (def: PackDef, cards: readonly Card[]) => statusOf(def, cards, testSetName)
const packShortName = (def: Pick<PackDef, 'type'>) =>
  shortNameOf({ ...def, setCode: 'Pandemonium' }, testSetName)

/** `count` normal pool cards named `<prefix> 1..count`, with `overrides`. */
function cardsOf(
  prefix: string,
  count: number,
  overrides: Parameters<typeof testCard>[1] = {},
): Card[] {
  return Array.from({ length: count }, (_, index) => testCard(`${prefix} ${index + 1}`, overrides))
}

const kesqer = (type: 'standard' | 'premium' | 'cursed'): PackDef => ({
  key: `${type}:Kesqer`,
  type,
  setCode: 'Kesqer',
  mechanicPack: null,
})
const pandemonium = (type: 'pandemonium' | 'pandemoniumCursed'): PackDef => ({
  key: `${type}:Pandemonium`,
  type,
  setCode: 'Pandemonium',
  mechanicPack: null,
})
const bloodBattle: PackDef = {
  key: 'mechanic:Blood & Battle',
  type: 'mechanic',
  setCode: null,
  mechanicPack: 'Blood & Battle',
}
const golden: PackDef = { key: 'golden', type: 'golden', setCode: null, mechanicPack: null }
const cursedGolden: PackDef = {
  key: 'cursedGolden',
  type: 'cursedGolden',
  setCode: null,
  mechanicPack: null,
}

const CURSED_DECK = [testCursedCard('Visions of Death')]
const held = { holder: { uid: 'bora', userCardId: 'h-1' } }

describe('packCatalog', () => {
  const cards = [
    testCard('Gurgitea Card', { setCode: 'Gurgitea', mechanicPack: 'Risk & Reward' }),
    testCard('Pandemonium Card', { setCode: 'Pandemonium', rarity: 'rare' }),
    testCard('Kesqer Card', { setCode: 'Kesqer', mechanicPack: 'Blood & Battle' }),
    testCard('Nigh Card', { setCode: 'The End is Nigh', mechanicPack: "Dungeoneer's Kit" }),
    testCard('Retired Card', {
      setCode: 'Pentagon',
      status: 'retired',
      mechanicPack: 'Permamancy',
    }),
    testCard('Draft Card', {
      setCode: 'Rhodelen',
      status: 'draft',
      mechanicPack: 'Horn of Plenty',
    }),
    testBlessedCard('Second Wind', { mechanicPack: 'Arcanus Divine' }),
    ...CURSED_DECK,
  ]

  it('groups the sets in the official order, with Pandemonium last', () => {
    const { setGroups } = packCatalog(cards)
    expect(setGroups.map((group) => group.title)).toEqual([
      'The End is Nigh Packs',
      'Kesqerian Nights Packs',
      'The Lost City of Gurgitea Packs',
      'Pandemonium Packs',
    ])
  })

  it('gives Pandemonium only its two packs, and every other set three', () => {
    const { setGroups } = packCatalog(cards)
    expect(setGroups.at(-1)?.packs.map(packTitle)).toEqual([
      'Pandemonium Pack',
      'Pandemonium Cursed Pack',
    ])
    expect(setGroups[1]?.packs.map(packTitle)).toEqual([
      'Kesqerian Nights Standard Pack',
      'Kesqerian Nights Premium Pack',
      'Kesqerian Nights Cursed Pack',
    ])
  })

  it('follows the stored order, and a set of the one-pack layout gets two packs', () => {
    const sets = setIndex([
      ...TEST_SETS.filter((set) => set.code !== 'Pandemonium' && set.code !== 'Kesqer'),
      testSet('Pandemonium', 'Pandemonium', 0, { packLayout: 'pandemonium' }),
      testSet('Kesqer', 'Kesqerian Nights', 5, { packLayout: 'pandemonium' }),
    ])
    const { setGroups } = packCatalog(cards, sets)
    expect(setGroups.map((group) => group.title)).toEqual([
      'Pandemonium Packs',
      'The End is Nigh Packs',
      'Kesqerian Nights Packs',
      'The Lost City of Gurgitea Packs',
    ])
    expect(setGroups[2]?.packs.map((def) => titleOf(def, sets.setName))).toEqual([
      'Kesqerian Nights Pack',
      'Kesqerian Nights Cursed Pack',
    ])
    expect(setGroups[2]?.packs.map((def) => shortNameOf(def, sets.setName))).toEqual([
      'Kesqerian Nights',
      'Cursed',
    ])
  })

  it('gives a set code that no stored set has the three standard packs, after the stored sets', () => {
    const zaddir = testCard('Zaddir Card', { setCode: 'Zaddir' })
    const { setGroups } = packCatalog([...cards, zaddir])
    expect(setGroups.at(-1)?.title).toBe('Zaddir Packs')
    expect(setGroups.at(-1)?.packs.map(packTitle)).toEqual([
      'Zaddir Standard Pack',
      'Zaddir Premium Pack',
      'Zaddir Cursed Pack',
    ])
  })

  it('lists the mechanic packs of normal and Blessed cards in Turkish order, without retired or draft cards', () => {
    expect(packCatalog(cards).mechanicPacks.map(packTitle)).toEqual([
      'Arcanus Divine Mechanic Pack',
      'Blood & Battle Mechanic Pack',
      "Dungeoneer's Kit Mechanic Pack",
      'Risk & Reward Mechanic Pack',
    ])
  })

  it('ends with the Golden Packs', () => {
    expect(packCatalog(cards).goldenPacks.map(packTitle)).toEqual([
      'Golden Pack',
      'Cursed Golden Pack',
    ])
  })

  it('rebuilds a pack from its type and scope', () => {
    expect(packDefOf({ type: 'premium', setCode: 'Kesqer', mechanicPack: null })).toEqual(
      kesqer('premium'),
    )
    expect(packDefOf(bloodBattle)).toEqual(bloodBattle)
    expect(packDefOf(golden)).toEqual(golden)
  })
})

describe('prices', () => {
  it('labels each pack with its LP and GP price', () => {
    expect(priceLabel('standard')).toBe('2 LP / 5.000 GP')
    expect(priceLabel('mechanic')).toBe('4 LP / 10.000 GP')
    expect(priceLabel('cursed')).toBe('1 LP / 2.500 GP')
  })

  it('has the prices of docs/domain.md', () => {
    expect(PACK_PRICES).toEqual({
      standard: { lp: 2, gp: 5000 },
      premium: { lp: 3, gp: 7500 },
      cursed: { lp: 1, gp: 2500 },
      pandemonium: { lp: 3, gp: 7500 },
      pandemoniumCursed: { lp: 3, gp: 7500 },
      mechanic: { lp: 4, gp: 10000 },
      golden: { lp: 4, gp: 10000 },
      cursedGolden: { lp: 3, gp: 7500 },
    })
  })
})

describe('packShortName', () => {
  it.each([
    ['standard', 'Standart'],
    ['premium', 'Premium'],
    ['cursed', 'Cursed'],
    ['pandemonium', 'Pandemonium'],
    ['pandemoniumCursed', 'Cursed'],
    ['golden', 'Golden'],
    ['cursedGolden', 'Cursed Golden'],
    ['mechanic', 'Mechanic'],
  ] as const)('names a %s pack "%s" on its tile in a group', (type, name) => {
    expect(packShortName({ type })).toBe(name)
  })

  it('covers every pack type', () => {
    expect(PACK_TYPES.map((type) => packShortName({ type })).every(Boolean)).toBe(true)
  })
})

describe('packStatus', () => {
  it('opens a Standard Pack at 9 cards of its set, and not at 8', () => {
    expect(packStatus(kesqer('standard'), cardsOf('K', 9)).canOpen).toBe(true)
    expect(packStatus(kesqer('standard'), cardsOf('K', 8))).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 9 Kesqerian Nights kartı gerekli, 8 var.',
    })
  })

  it('says why Ballad of Ulagal with 1 card cannot open', () => {
    const ulagal: PackDef = {
      key: 'standard:Ulagal',
      type: 'standard',
      setCode: 'Ulagal',
      mechanicPack: null,
    }
    const status = packStatus(ulagal, [testCard('Ulagal Card', { setCode: 'Ulagal' })])
    expect(status).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 9 Ballad of Ulagal kartı gerekli, 1 var.',
    })
  })

  it('does not count held, retired or draft cards', () => {
    const cards = [
      ...cardsOf('K', 8),
      testCard('Held', held),
      testCard('Retired', { status: 'retired' }),
      testCard('Draft', { status: 'draft' }),
    ]
    expect(packStatus(kesqer('standard'), cards).canOpen).toBe(false)
  })

  it('never offers a card whose channels are off, and does not count one', () => {
    const secret = { isInDraws: false, isInSetPacks: false, isInMechanicPacks: false }
    const cards = [
      ...cardsOf('K', 8),
      testCard('Secret Rare', { ...secret, rarity: 'rare' }),
      testCard('Secret Pandemonium', { ...secret, setCode: 'Pandemonium', rarity: 'rare' }),
      testBlessedCard('Secret Blessing', secret),
      testCursedCard('Crown of Ash', { isInDraws: false }),
      ...CURSED_DECK,
    ]
    expect(packStatus(kesqer('standard'), cards).canOpen).toBe(false)
    const defs = [
      kesqer('standard'),
      kesqer('premium'),
      kesqer('cursed'),
      pandemonium('pandemonium'),
      pandemonium('pandemoniumCursed'),
      cursedGolden,
      ...packCatalog(cards).mechanicPacks,
    ]
    const secrets = new Set([
      'Secret Rare',
      'Secret Pandemonium',
      'Secret Blessing',
      'Crown of Ash',
    ])
    for (const def of defs) {
      const pools = packPools(def, cards)
      const offered = [...pools.cards, ...(pools.slot ?? []), ...(pools.cursed ?? [])]
      expect(offered.filter((card) => secrets.has(card.name))).toEqual([])
    }
  })

  it('gives the set packs the cards with "Set paketlerinde çıkar" on, and counts only those', () => {
    const kept = cardsOf('K', 9).map((card, index) =>
      index < 2 ? { ...card, isInSetPacks: false as const } : card,
    )
    expect(packStatus(kesqer('standard'), kept).canOpen).toBe(false)
    expect(packPools(kesqer('standard'), kept).cards).toHaveLength(7)
    const mechanicOnly = testCard('Mechanic Only', { isInSetPacks: false })
    expect(packPools(kesqer('standard'), [mechanicOnly]).cards).toEqual([])
    const bloodOnly = testCard('Blood Only', {
      isInSetPacks: false,
      mechanicPack: 'Blood & Battle',
    })
    expect(packPools(bloodBattle, [bloodOnly]).cards).toHaveLength(1)
  })

  it("gives a one-pack set's packs its Rares and the Blessed cards with the set flag on", () => {
    const rare = testCard('Pan Rare', { setCode: 'Pandemonium', rarity: 'rare' })
    const setBlessing = testBlessedCard('Set Blessing', { isInMechanicPacks: false })
    const mechanicBlessing = testBlessedCard('Mechanic Blessing', { isInSetPacks: false })
    const pools = packPools(pandemonium('pandemonium'), [rare, setBlessing, mechanicBlessing])
    expect(pools.cards.map((card) => card.name)).toEqual(['Pan Rare', 'Set Blessing'])
  })

  it('gives the Golden Packs the Rares and Blessed cards with "Mechanic paketlerinde çıkar" on', () => {
    const rare = testCard('Golden Rare', { rarity: 'rare' })
    const setOnlyRare = testCard('Set Rare', { rarity: 'rare', isInMechanicPacks: false })
    const setBlessing = testBlessedCard('Set Blessing', { isInMechanicPacks: false })
    const mechanicBlessing = testBlessedCard('Mechanic Blessing', { isInSetPacks: false })
    const pools = packPools(golden, [rare, setOnlyRare, setBlessing, mechanicBlessing])
    expect(pools.cards.map((card) => card.name)).toEqual(['Golden Rare', 'Mechanic Blessing'])
  })

  it('takes the Cursed slot from the Cursed Deck', () => {
    const kept = testCursedCard('Kept Out', { isInDraws: false })
    const one = testCursedCard('Where They Breed', { isRepeatable: false, ...held })
    const pools = packPools(kesqer('cursed'), [...cardsOf('K', 5), kept, one, ...CURSED_DECK])
    expect(pools.cursed).toEqual(CURSED_DECK)
  })

  it('opens a Premium Pack at 9 cards with 3 Rares, and not with 2', () => {
    const rares = (count: number) => cardsOf('R', count, { rarity: 'rare' })
    expect(packStatus(kesqer('premium'), [...cardsOf('K', 6), ...rares(3)]).canOpen).toBe(true)
    expect(packStatus(kesqer('premium'), [...cardsOf('K', 7), ...rares(2)])).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 3 Kesqerian Nights Rare kartı gerekli, 2 var.',
    })
  })

  it('opens a Cursed Pack at 5 Common cards of its set and a card in the Cursed Deck', () => {
    const commons = cardsOf('K', 5)
    expect(packStatus(kesqer('cursed'), [...commons, ...CURSED_DECK]).canOpen).toBe(true)
    expect(
      packStatus(kesqer('cursed'), [
        ...cardsOf('K', 4),
        ...cardsOf('R', 5, { rarity: 'rare' }),
        ...CURSED_DECK,
      ]).canOpen,
    ).toBe(false)
  })

  it('closes the three Cursed types while the Cursed Deck is empty', () => {
    const rares = cardsOf('P', 49, { setCode: 'Pandemonium', rarity: 'rare' })
    const reason = { canOpen: false, reason: "Cursed Deck'te kart yok." }
    expect(packStatus(kesqer('cursed'), cardsOf('K', 5))).toEqual(reason)
    expect(packStatus(pandemonium('pandemoniumCursed'), rares)).toEqual(reason)
    expect(packStatus(cursedGolden, rares)).toEqual(reason)
    expect(
      packStatus(cursedGolden, [...rares, testCursedCard('Retired Curse', { status: 'retired' })]),
    ).toEqual(reason)
  })

  it('opens a Pandemonium Pack at 9 Pandemonium Rares, and its Cursed Pack at 5', () => {
    const rares = (count: number) => cardsOf('P', count, { setCode: 'Pandemonium', rarity: 'rare' })
    expect(packStatus(pandemonium('pandemonium'), rares(9)).canOpen).toBe(true)
    expect(packStatus(pandemonium('pandemonium'), rares(8))).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 9 Pandemonium Rare kartı gerekli, 8 var.',
    })
    expect(
      packStatus(pandemonium('pandemoniumCursed'), [...rares(5), ...CURSED_DECK]).canOpen,
    ).toBe(true)
    expect(
      packStatus(pandemonium('pandemoniumCursed'), [...rares(4), ...CURSED_DECK]).canOpen,
    ).toBe(false)
  })

  it('counts Blessed cards for a Mechanic Pack', () => {
    const normals = cardsOf('B', 27, { mechanicPack: 'Blood & Battle' })
    const blessed = [1, 2, 3].map((n) =>
      testBlessedCard(`Blessed ${n}`, { mechanicPack: 'Blood & Battle' }),
    )
    expect(packStatus(bloodBattle, [...normals, ...blessed]).canOpen).toBe(true)
    expect(packStatus(bloodBattle, [...normals, ...blessed.slice(0, 1)])).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 29 Blood & Battle kartı gerekli, 28 var.',
    })
  })

  it('does not count Blessed cards as Rare for the Golden Packs', () => {
    const rares = (count: number) => cardsOf('R', count, { rarity: 'rare' })
    const blessed = Array.from({ length: 19 }, (_, n) => testBlessedCard(`Blessed ${n}`))
    expect(packStatus(golden, [...rares(49), ...blessed]).canOpen).toBe(true)
    expect(packStatus(golden, [...rares(48), ...blessed])).toEqual({
      canOpen: false,
      reason: 'Havuzda yeterli kart yok: en az 49 Rare kart gerekli, 48 var.',
    })
    expect(packStatus(cursedGolden, [...rares(5), ...CURSED_DECK]).canOpen).toBe(true)
    expect(packStatus(cursedGolden, [...rares(4), ...blessed, ...CURSED_DECK]).canOpen).toBe(false)
  })
})

describe('spreadBackOf', () => {
  it.each([
    ['standard', 'Kesqer', null, { kind: 'set', setCode: 'Kesqer' }],
    ['premium', 'Kesqer', null, { kind: 'set', setCode: 'Kesqer' }],
    ['pandemonium', 'Pandemonium', null, { kind: 'set', setCode: 'Pandemonium' }],
    ['cursed', 'Kesqer', null, { kind: 'cursed' }],
    ['pandemoniumCursed', 'Pandemonium', null, { kind: 'cursed' }],
    ['cursedGolden', null, null, { kind: 'cursed' }],
    ['mechanic', null, 'Blood & Battle', { kind: 'pack', packKey: 'mechanic:Blood & Battle' }],
    ['golden', null, null, { kind: 'neutral' }],
  ] as const)('gives a %s pack the back of its spread', (packType, setCode, mechanicPack, back) => {
    expect(spreadBackOf({ packType, setCode, mechanicPack })).toEqual(back)
  })
})

describe('packCardBack', () => {
  const golden = { packType: 'golden', setCode: null, mechanicPack: null } as const

  it('gives each card of a Golden Pack its own back, or the neutral back while it loads', () => {
    expect(packCardBack(golden, testCard('Harbor Light', { setCode: 'Kesqer' }))).toEqual({
      kind: 'set',
      setCode: 'Kesqer',
    })
    expect(packCardBack(golden, testBlessedCard('Second Wind'))).toEqual({ kind: 'blessed' })
    expect(packCardBack(golden, undefined)).toEqual({ kind: 'neutral' })
  })

  it.each([
    ['standard', 'Kesqer', null],
    ['cursed', 'Kesqer', null],
    ['cursedGolden', null, null],
    ['mechanic', null, 'Blood & Battle'],
  ] as const)(
    "gives every card of a %s pack the pack's back",
    (packType, setCode, mechanicPack) => {
      const pack = { packType, setCode, mechanicPack }
      for (const card of [
        testBlessedCard('Second Wind'),
        testCard('Ulagal Card', { setCode: 'Ulagal' }),
        undefined,
      ]) {
        expect(packCardBack(pack, card)).toEqual(spreadBackOf(pack))
      }
    },
  )
})

describe('groupArtUrl', () => {
  const art = artLookup(
    testArt({
      packs: { golden: '/art/packs/golden.0123456789.webp', 'standard:Havenholm': '/art/h.webp' },
      cardbacks: { Kesqer: '/art/backs/kesqer.0123456789.webp' },
    }),
  )
  const group = (setCode: string) => ({
    packs: [{ key: `standard:${setCode}`, type: 'standard' as const, setCode, mechanicPack: null }],
  })

  it("gives a set's group its set's cardback, never a set pack's own picture", () => {
    expect(groupArtUrl(art, group('Havenholm'))).toBeNull()
    expect(groupArtUrl(art, group('Kesqer'))).toBe('/art/backs/kesqer.0123456789.webp')
    expect(groupArtUrl(art, group('Ulagal'))).toBeNull()
  })

  it('gives the Golden Packs the Golden Pack picture', () => {
    expect(groupArtUrl(art, { packs: GOLDEN_PACKS })).toBe('/art/packs/golden.0123456789.webp')
    expect(groupArtUrl(artLookup(testArt({})), { packs: GOLDEN_PACKS })).toBeNull()
  })

  it('gives an empty group no picture', () => {
    expect(groupArtUrl(art, { packs: [] })).toBeNull()
  })
})

describe('burstArtUrl', () => {
  const ART = artLookup(
    testArt({
      cardbacks: {
        Kesqer: '/art/backs/kesqer.0123456789.webp',
        Pandemonium: '/art/backs/pandemonium.0123456789.webp',
      },
      packs: {
        'mechanic:Blood & Battle': '/art/packs/mechanic-blood-battle.0123456789.webp',
        golden: '/art/packs/golden.0123456789.webp',
        'standard:Havenholm': '/art/packs/standard-havenholm.0123456789.webp',
      },
    }),
  )
  const burst = (packType: PackDef['type'], setCode: string | null, mechanicPack: string | null) =>
    burstArtUrl(ART, { packType, setCode, mechanicPack })

  it("bursts a set's cardback for its packs, Cursed and Pandemonium ones included", () => {
    expect(burst('premium', 'Kesqer', null)).toBe('/art/backs/kesqer.0123456789.webp')
    expect(burst('cursed', 'Kesqer', null)).toBe('/art/backs/kesqer.0123456789.webp')
    expect(burst('pandemoniumCursed', 'Pandemonium', null)).toBe(
      '/art/backs/pandemonium.0123456789.webp',
    )
  })

  it("bursts a set's own pack picture when its cardback has none", () => {
    expect(burst('standard', 'Havenholm', null)).toBe(
      '/art/packs/standard-havenholm.0123456789.webp',
    )
  })

  it('bursts the pack picture of a Mechanic or Golden Pack', () => {
    expect(burst('mechanic', null, 'Blood & Battle')).toBe(
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(burst('golden', null, null)).toBe('/art/packs/golden.0123456789.webp')
  })

  it('has no picture without one', () => {
    expect(burst('cursedGolden', null, null)).toBeNull()
    expect(burst('mechanic', null, 'Permamancy')).toBeNull()
    expect(burst('premium', 'Havenholm', null)).toBeNull()
  })
})

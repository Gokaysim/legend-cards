import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { DRAW_LIMITS, drawSchema } from './schema'

const paid = {
  kind: 'random',
  uid: 'ayla',
  by: 'ayla',
  at: Timestamp.fromMillis(1000),
  cardId: 'legend-abolethseyes',
  cardName: "Aboleth's Eyes",
  cardKind: 'normal',
  holdingId: 'h1',
  filters: null,
  paidWith: 'lp',
  cost: 1,
  entryId: 'e1',
}

const free = { ...paid, by: 'dana', paidWith: 'none', cost: 0, entryId: null }
const filters = { cost: '2', mechanicPack: 'Blood & Battle', rarity: 'rare', keyword: 'kan' }
const noFilters = { cost: null, mechanicPack: null, rarity: null, keyword: null }

const cursed = {
  ...free,
  kind: 'cursed',
  by: 'ayla',
  cardId: 'cursed-visionsofdeath',
  cardName: 'Visions of Death',
  cardKind: 'cursed',
}

const accepts = (draw: object) => drawSchema.safeParse(draw).success

describe('drawSchema', () => {
  it.each([
    ["a player's paid draw of a normal card", paid],
    ["a player's paid draw of a Blessed card", { ...paid, cardKind: 'blessed' }],
    ["the DM's free draw", free],
    ["the DM's free draw with filters", { ...free, filters }],
    [
      "the DM's free draw with some filters",
      { ...free, filters: { ...noFilters, rarity: 'blessed' } },
    ],
    ['a Cursed draw', cursed],
    ['a draw whose server time is still pending', { ...paid, at: null }],
  ])('accepts %s', (_case, draw) => {
    expect(accepts(draw)).toBe(true)
  })

  it.each([
    ['an unknown kind', { ...paid, kind: 'pack' }],
    ['a random draw of a Cursed card', { ...paid, cardKind: 'cursed' }],
    ['a Cursed draw of a normal card', { ...cursed, cardKind: 'normal' }],
    ['a Cursed draw of a Blessed card', { ...cursed, cardKind: 'blessed' }],
    ['a paid draw that costs 0', { ...paid, cost: 0 }],
    ['a paid draw without its entry', { ...paid, entryId: null }],
    ['a free draw that costs 1', { ...free, cost: 1 }],
    ['a free draw with an entry', { ...free, entryId: 'e1' }],
    ['a cost of 2', { ...paid, cost: 2 }],
    ['a paid Cursed draw', { ...cursed, paidWith: 'lp', cost: 1, entryId: 'e1' }],
    ['a Cursed draw with filters', { ...cursed, filters }],
    ['a paid draw with filters', { ...paid, filters }],
    ['an unknown rarity filter', { ...free, filters: { ...filters, rarity: 'legendary' } }],
    ['an empty filter', { ...free, filters: { ...filters, keyword: '' } }],
    [
      'a keyword over the limit',
      { ...free, filters: { ...filters, keyword: 'x'.repeat(DRAW_LIMITS.keyword + 1) } },
    ],
    ['filters without a field', { ...free, filters: { cost: null } }],
    ['a missing holding', { ...paid, holdingId: undefined }],
  ])('rejects %s', (_case, draw) => {
    expect(accepts(draw)).toBe(false)
  })
})

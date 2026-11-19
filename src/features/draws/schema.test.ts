import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import {
  DRAW_LIMITS,
  DRAW_SESSION_MAX,
  drawSchema,
  drawSessionSchema,
  isCardDraw,
  isPackOpening,
} from './schema'

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
const filters = {
  setCode: 'Kesqer',
  cost: '2',
  mechanicPack: 'Blood & Battle',
  rarity: 'rare',
  keyword: 'kan',
}
const noFilters = { setCode: null, cost: null, mechanicPack: null, rarity: null, keyword: null }

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
    ["a player's paid draw with filters, under the table's player draw mode", { ...paid, filters }],
    [
      "the DM's free draw with some filters",
      { ...free, filters: { ...noFilters, rarity: 'blessed' } },
    ],
    ['a Cursed draw', cursed],
    [
      'a draw from before the set filter, without a set code',
      { ...free, filters: { cost: null, mechanicPack: null, rarity: 'rare', keyword: null } },
    ],
    ['a draw whose server time is still pending', { ...paid, at: null }],
    ['a draw at another price', { ...paid, cost: 3 }],
    ['a draw at the highest price', { ...paid, cost: 1_000_000 }],
  ])('accepts %s', (_case, draw) => {
    expect(accepts(draw)).toBe(true)
  })

  it.each([
    ['an unknown kind', { ...paid, kind: 'gift' }],
    ['a random draw of a Cursed card', { ...paid, cardKind: 'cursed' }],
    ['a Cursed draw of a normal card', { ...cursed, cardKind: 'normal' }],
    ['a Cursed draw of a Blessed card', { ...cursed, cardKind: 'blessed' }],
    ['a paid draw that costs 0', { ...paid, cost: 0 }],
    ['a paid draw without its entry', { ...paid, entryId: null }],
    ['a free draw that costs 1', { ...free, cost: 1 }],
    ['a free draw with an entry', { ...free, entryId: 'e1' }],
    ['a price without its entry', { ...paid, cost: 3, entryId: null }],
    ['a free draw that costs 3', { ...free, cost: 3 }],
    ['a fractional price', { ...paid, cost: 1.5 }],
    ['a negative price', { ...paid, cost: -1 }],
    ['a price over the limit', { ...paid, cost: 1_000_001 }],
    ['a paid Cursed draw', { ...cursed, paidWith: 'lp', cost: 1, entryId: 'e1' }],
    ['a Cursed draw with filters', { ...cursed, filters }],
    ['an unknown rarity filter', { ...free, filters: { ...filters, rarity: 'legendary' } }],
    ['an empty filter', { ...free, filters: { ...filters, keyword: '' } }],
    [
      'a keyword over the limit',
      { ...free, filters: { ...filters, keyword: 'x'.repeat(DRAW_LIMITS.keyword + 1) } },
    ],
    [
      'a set code over the limit',
      { ...free, filters: { ...filters, setCode: 'x'.repeat(DRAW_LIMITS.setCode + 1) } },
    ],
    ['filters without a field', { ...free, filters: { cost: null } }],
    ['a missing holding', { ...paid, holdingId: undefined }],
  ])('rejects %s', (_case, draw) => {
    expect(accepts(draw)).toBe(false)
  })

  it('reads a record without a session as having none', () => {
    expect(drawSchema.parse(paid)).toMatchObject({ sessionId: null })
    expect(drawSchema.parse({ ...paid, sessionId: 's1' })).toMatchObject({ sessionId: 's1' })
  })

  it('rejects an empty session id', () => {
    expect(accepts({ ...paid, sessionId: '' })).toBe(false)
  })

  it('reads a missing set code as no set', () => {
    const old = {
      ...free,
      filters: { cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
    }
    expect(drawSchema.parse(old)).toMatchObject({ filters: { ...noFilters, rarity: 'rare' } })
  })
})

const offered = ['legend-a', 'legend-b', 'legend-c', 'legend-d', 'legend-e']

const openPack = {
  kind: 'pack',
  uid: 'ayla',
  by: 'ayla',
  at: Timestamp.fromMillis(1000),
  packType: 'standard',
  setCode: 'Kesqer',
  mechanicPack: null,
  offered,
  revealed: [],
  paidWith: 'lp',
  cost: 2,
  entryId: 'e1',
  status: 'open',
  closedAt: null,
  closedBy: null,
  chosen: null,
  cursed: null,
  refundEntryId: null,
}

const chosenPack = {
  ...openPack,
  revealed: [2, 0, 1, 4, 3],
  status: 'chosen',
  closedAt: Timestamp.fromMillis(2000),
  closedBy: 'ayla',
  chosen: { cardId: 'legend-c', cardName: 'C', cardKind: 'normal', holdingId: 'h1' },
}

const cursedOffered = ['legend-a', 'legend-b', 'cursed-x', 'legend-c', 'legend-d', 'legend-e']

const chosenCursedPack = {
  ...chosenPack,
  packType: 'cursed',
  cost: 1,
  offered: cursedOffered,
  revealed: [0, 1, 2, 3, 4, 5],
  cursed: { cardId: 'cursed-x', cardName: 'Visions of Death', holdingId: 'h2' },
}

const cancelledPack = {
  ...openPack,
  revealed: [1],
  status: 'cancelled',
  closedAt: Timestamp.fromMillis(2000),
  closedBy: 'dm',
  refundEntryId: 'e2',
}

const goldenPack = {
  ...openPack,
  by: 'dm',
  packType: 'golden',
  setCode: null,
  paidWith: 'gp',
  cost: 10000,
}

describe('drawSchema: pack openings', () => {
  it.each([
    ['an open pack paid with LP', openPack],
    ['an open pack with turned cards', { ...openPack, revealed: [4, 0] }],
    ['a free pack', { ...openPack, by: 'dm', paidWith: 'none', cost: 0, entryId: null }],
    ['a Golden Pack paid with GP', goldenPack],
    [
      'a Mechanic Pack',
      { ...openPack, packType: 'mechanic', setCode: null, mechanicPack: 'Blood & Battle' },
    ],
    ['a chosen pack', chosenPack],
    ['a chosen pack whose end time is pending', { ...chosenPack, closedAt: null }],
    [
      'a chosen Blessed card',
      { ...chosenPack, chosen: { ...chosenPack.chosen, cardKind: 'blessed' } },
    ],
    ["a Cursed Pack's choice with its Cursed card", chosenCursedPack],
    ['a cancelled paid pack with its refund', cancelledPack],
    [
      'a cancelled free pack without a refund',
      { ...cancelledPack, paidWith: 'none', cost: 0, entryId: null, refundEntryId: null },
    ],
  ])('accepts %s', (_case, draw) => {
    expect(accepts(draw)).toBe(true)
  })

  it.each([
    ['an unknown pack type', { ...openPack, packType: 'rare' }],
    ['a paid pack that costs 0', { ...openPack, cost: 0 }],
    ['a paid pack without its entry', { ...openPack, entryId: null }],
    ['a free pack that costs something', { ...openPack, paidWith: 'none', entryId: null }],
    ['a cost over the limit', { ...openPack, cost: 1_000_001 }],
    ['a fractional cost', { ...openPack, cost: 1.5 }],
    ['a set pack without its set', { ...openPack, setCode: null }],
    ['a Golden Pack with a set', { ...goldenPack, setCode: 'Kesqer' }],
    [
      'a Mechanic Pack without its mechanic pack',
      { ...openPack, packType: 'mechanic', setCode: null },
    ],
    ['a set pack with a mechanic pack', { ...openPack, mechanicPack: 'Blood & Battle' }],
    ['4 shown cards', { ...openPack, offered: offered.slice(0, 4) }],
    ['6 shown cards in a Standard Pack', { ...openPack, offered: cursedOffered }],
    ['5 shown cards in a Cursed Pack', { ...openPack, packType: 'cursed', cost: 1 }],
    ['a repeated shown card', { ...openPack, offered: [...offered.slice(0, 4), 'legend-a'] }],
    ['a position turned twice', { ...openPack, revealed: [1, 1] }],
    ['a turned position that was not shown', { ...openPack, revealed: [5] }],
    ['an open pack that names who ended it', { ...openPack, closedBy: 'ayla' }],
    ['an open pack with a chosen card', { ...openPack, chosen: chosenPack.chosen }],
    ['an ended pack without who ended it', { ...chosenPack, closedBy: null }],
    ['a chosen pack without its card', { ...chosenPack, chosen: null }],
    ['a choice before every card is turned', { ...chosenPack, revealed: [0, 1] }],
    [
      'a chosen card that was not shown',
      { ...chosenPack, chosen: { ...chosenPack.chosen, cardId: 'legend-z' } },
    ],
    [
      'a chosen Cursed card',
      { ...chosenPack, chosen: { ...chosenPack.chosen, cardKind: 'cursed' } },
    ],
    ["a Cursed Pack's choice without its Cursed card", { ...chosenCursedPack, cursed: null }],
    [
      "a Standard Pack's choice with a Cursed card",
      { ...chosenPack, cursed: chosenCursedPack.cursed },
    ],
    [
      'the Cursed card as the chosen card too',
      { ...chosenCursedPack, cursed: { ...chosenCursedPack.cursed, cardId: 'legend-c' } },
    ],
    ['a cancelled paid pack without its refund', { ...cancelledPack, refundEntryId: null }],
    ['an open pack with a refund', { ...openPack, refundEntryId: 'e2' }],
    ['a cancelled pack with a chosen card', { ...cancelledPack, chosen: chosenPack.chosen }],
  ])('rejects %s', (_case, draw) => {
    expect(accepts(draw)).toBe(false)
  })

  it('tells card draws and pack openings apart', () => {
    const pack = drawSchema.parse(openPack)
    const draw = drawSchema.parse(paid)
    expect(isPackOpening({ ...pack, id: 'p1' })).toBe(true)
    expect(isCardDraw({ ...draw, id: 'd1' })).toBe(true)
    expect(isCardDraw({ ...pack, id: 'p1' })).toBe(false)
  })
})

const sessionDraw = (index: number, backSet: string | null = null) => ({
  drawId: `d${index}`,
  cardId: `legend-${index}`,
  backSet,
  cost: 1,
})

const openSession = {
  kind: 'random',
  uid: 'ayla',
  by: 'ayla',
  startedAt: Timestamp.fromMillis(1000),
  lastAt: Timestamp.fromMillis(2000),
  draws: [sessionDraw(0), sessionDraw(1), sessionDraw(2)],
  turned: [1],
  endedAt: null,
  endedBy: null,
}

const endedSession = { ...openSession, endedAt: Timestamp.fromMillis(3000), endedBy: 'ayla' }

const acceptsSession = (session: object) => drawSessionSchema.safeParse(session).success

describe('drawSessionSchema', () => {
  it.each([
    ['an open session', openSession],
    ['an ended session', endedSession],
    [
      "the DM's session with a set back",
      { ...openSession, by: 'dana', draws: [sessionDraw(0, 'Kesqer')], turned: [] },
    ],
    ['a Cursed session', { ...openSession, kind: 'cursed' }],
    ['pending server times', { ...openSession, startedAt: null, lastAt: null }],
    ['an end whose time is still pending', { ...endedSession, endedAt: null }],
  ])('accepts %s', (_case, session) => {
    expect(acceptsSession(session)).toBe(true)
  })

  it.each([
    ['no draws', { ...openSession, draws: [] }],
    ['a turned index outside the draws', { ...openSession, turned: [3] }],
    ['a card turned twice', { ...openSession, turned: [1, 1] }],
    ['a negative index', { ...openSession, turned: [-1] }],
    ['an end without who ended it', { ...endedSession, endedBy: null }],
    [
      'a Cursed session with a set back',
      { ...openSession, kind: 'cursed', draws: [sessionDraw(0, 'Kesqer')], turned: [] },
    ],
    ['an unknown kind', { ...openSession, kind: 'pack' }],
    [
      'more draws than a session keeps',
      {
        ...openSession,
        draws: Array.from({ length: DRAW_SESSION_MAX + 1 }, (_, i) => sessionDraw(i)),
      },
    ],
    ['a negative price', { ...openSession, draws: [{ ...sessionDraw(0), cost: -1 }], turned: [] }],
    [
      'a fractional price',
      { ...openSession, draws: [{ ...sessionDraw(0), cost: 0.5 }], turned: [] },
    ],
  ])('rejects %s', (_case, session) => {
    expect(acceptsSession(session)).toBe(false)
  })

  it("reads each card's price, and a card stored before the prices as having none", () => {
    const { cost: _cost, ...older } = sessionDraw(0)
    const session = { ...openSession, draws: [older, { ...sessionDraw(1), cost: 2 }], turned: [] }
    expect(drawSessionSchema.parse(session).draws.map((draw) => draw.cost)).toEqual([null, 2])
  })
})

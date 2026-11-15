import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { cardsContextValue } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import type { CardStatus } from '@/features/cards/status'
import type { PackOpening } from '@/features/draws/schema'
import { testCard } from '@/test/cardFixtures'
import { ready } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testCardsOf, testPack } from '@/test/packFixtures'
import { testSetByCode, testSetIndex } from '@/test/setFixtures'

import { setCardRows, setCards, setTiles } from './setStats'

const NOW = new Date(2026, 10, 15).getTime()
const kesqer = testSetByCode('Kesqer')
const pandemonium = testSetByCode('Pandemonium')

const draft = testCard("Kalisha's Multiclass", { status: 'draft' })
const dmOnly = testCard("Dionus' Double Dose", { dmOnly: true })
const retired = testCard('Old Trick', { status: 'retired' })
const active = testCardsOf('Kesqer', 120)

/** The counted cards of Kesqer on the device of the DM or of a player. */
function countedOn(isDm: boolean, cards: Card[]): Card[] {
  const value = cardsContextValue(ready(cards), isDm)
  const listed = isDm ? value.definitions : value.cards
  if (listed.status !== 'ready') throw new Error('not ready')
  return setCards(listed.data, kesqer, testSetIndex)
}

const inPool: CardStatus = { inPool: true, holderNames: [] }
const statusesOf = (cards: readonly Card[], held: Record<string, string[]> = {}) =>
  new Map<string, CardStatus>(
    cards.map((card) => [
      card.id,
      held[card.id] ? { inPool: false, holderNames: held[card.id] ?? [] } : inPool,
    ]),
  )

/** A pack of `setCode` that was opened and not cancelled, unless overridden. */
function opened(id: string, packType: PackOpening['packType'], setCode: string, status = 'chosen') {
  return testPack('ayla', {
    id,
    packType,
    setCode,
    offered:
      packType === 'cursed' || packType === 'pandemoniumCursed'
        ? ['a', 'b', 'c', 'd', 'e', 'f']
        : ['a', 'b', 'c', 'd', 'e'],
    status: status as PackOpening['status'],
  })
}

describe('setCards', () => {
  it('counts 120 cards for a player and 122 for the DM, marking the draft and the DM-only card', () => {
    const all = [...active, draft, dmOnly]
    expect(countedOn(false, all)).toHaveLength(120)
    const dmCards = countedOn(true, all)
    expect(dmCards).toHaveLength(122)

    const rows = setCardRows(dmCards, { holdings: [], packs: [] }, statusesOf(dmCards), NOW)
    expect(rows.find((row) => row.card.id === draft.id)?.marks).toEqual(['Taslak'])
    expect(rows.find((row) => row.card.id === dmOnly.id)?.marks).toEqual(["DM'e özel"])
    expect(rows.find((row) => row.card.id === active[0]?.id)?.marks).toEqual([])
  })

  it("marks a retired card on the DM's page, and leaves it out of a player's", () => {
    const all = [...active.slice(0, 2), retired]
    expect(countedOn(false, all)).toHaveLength(2)
    const dmCards = countedOn(true, all)
    const rows = setCardRows(dmCards, { holdings: [], packs: [] }, statusesOf(dmCards), NOW)
    expect(rows.find((row) => row.card.id === retired.id)?.marks).toEqual(['Kaldırıldı'])
  })

  it('leaves out the cards of other sets, and Blessed and Cursed cards', () => {
    const other = testCard('Pandemonium Card', { setCode: 'Pandemonium' })
    expect(setCards([...active.slice(0, 3), other], kesqer, testSetIndex)).toHaveLength(3)
  })
})

describe('setCardRows', () => {
  it('counts each card from its own records and skips the holdings of cards outside the set', () => {
    const [first, second] = active
    if (!first || !second) throw new Error('missing cards')
    const outside = testCard('Pandemonium Card', { setCode: 'Pandemonium' })
    const holdings = [
      testHolding(first, 'ayla', 1000, {
        id: 'h-1',
        returnedAt: Timestamp.fromMillis(2000),
        returnedBy: 'ayla',
        returnReason: 'used',
        useCost: 1,
      }),
      testHolding(outside, 'bora', 1000, { id: 'h-2' }),
    ]
    const shown = testPack('bora', {
      offered: [first.id, second.id, 'x', 'y', 'z'],
      revealed: [0, 1, 2, 3, 4],
      status: 'chosen',
      closedBy: 'bora',
      chosen: { cardId: second.id, cardName: second.name, cardKind: 'normal', holdingId: 'h-3' },
    })
    const cards = [first, second]
    const rows = setCardRows(cards, { holdings, packs: [shown] }, statusesOf(cards), NOW)
    expect(rows).toHaveLength(2)
    expect(rows[0]?.stats).toMatchObject({ used: 1, lpPaid: 1, shown: 1, taken: 0 })
    expect(rows[1]?.stats).toMatchObject({ used: 0, shown: 1, taken: 1 })
  })

  it('gives the Durum text, a draft reading "Taslak" and a DM-only card only its holders', () => {
    const [first] = active
    if (!first) throw new Error('missing card')
    const cards = [first, draft, dmOnly]
    const statuses = statusesOf(cards, { [first.id]: ['Bora'], [dmOnly.id]: ['Ayla'] })
    statuses.set(draft.id, { inPool: false, holderNames: [] })
    const rows = setCardRows(cards, { holdings: [], packs: [] }, statuses, NOW)
    expect(rows.map((row) => row.status)).toEqual(['Elde: Bora', 'Taslak', 'Elde: Ayla'])
  })
})

describe('setTiles', () => {
  it('sums the rows, and counts the opened packs of the set by type, leaving out a cancelled one', () => {
    const cards = active.slice(0, 5)
    const held = { [cards[0]?.id ?? '']: ['Bora'], [cards[1]?.id ?? '']: ['Ayla'] }
    const rows = setCardRows(cards, { holdings: [], packs: [] }, statusesOf(cards, held), NOW)
    const packs = [
      ...Array.from({ length: 21 }, (_, i) => opened(`s${i}`, 'standard', 'Kesqer')),
      ...Array.from({ length: 12 }, (_, i) => opened(`p${i}`, 'premium', 'Kesqer')),
      ...Array.from({ length: 4 }, (_, i) => opened(`c${i}`, 'cursed', 'Kesqer', 'open')),
      opened('cancelled', 'standard', 'Kesqer', 'cancelled'),
      opened('other', 'standard', 'Ashavir'),
    ]
    const tiles = setTiles(rows, kesqer, packs, testSetIndex)
    expect(tiles).toMatchObject({ cards: 5, inPool: 3, held: 2 })
    expect(tiles.packs).toEqual({
      total: 37,
      parts: [
        { name: 'Standard', count: 21 },
        { name: 'Premium', count: 12 },
        { name: 'Cursed', count: 4 },
      ],
    })
  })

  it('names the packs of a one-pack set "Pack" and "Cursed Pack"', () => {
    const packs = [
      opened('a', 'pandemonium', 'Pandemonium'),
      opened('b', 'pandemoniumCursed', 'Pandemonium'),
      opened('c', 'pandemoniumCursed', 'Pandemonium'),
    ]
    expect(setTiles([], pandemonium, packs, testSetIndex).packs).toEqual({
      total: 3,
      parts: [
        { name: 'Pack', count: 1 },
        { name: 'Cursed Pack', count: 2 },
      ],
    })
  })

  it('counts the cards never held, and sums how the others reached and left hands', () => {
    const cards = active.slice(0, 4)
    const [first, second] = cards
    if (!first || !second) throw new Error('missing cards')
    const holdings = [
      testHolding(first, 'ayla', 1000, {
        id: 'h-1',
        returnedAt: Timestamp.fromMillis(2000),
        returnedBy: 'dm-1',
        returnReason: 'transferred',
        transferredTo: 'h-2',
      }),
      testHolding(first, 'bora', 2000, {
        id: 'h-2',
        givenVia: 'transfer',
        transferredFrom: 'h-1',
        returnedAt: Timestamp.fromMillis(3000),
        returnedBy: 'dm-1',
        returnReason: 'discarded',
      }),
      testHolding(second, 'ayla', 1000, {
        id: 'h-3',
        givenVia: 'draw',
        drawId: 'd-1',
        returnedAt: Timestamp.fromMillis(2000),
        returnedBy: 'ayla',
        returnReason: 'used',
        useCost: 2,
        useEntryId: 'e-1',
      }),
    ]
    const rows = setCardRows(cards, { holdings, packs: [] }, statusesOf(cards), NOW)
    const tiles = setTiles(rows, kesqer, [], testSetIndex)
    expect(tiles).toMatchObject({
      neverHeld: 2,
      reached: { dm: 1, draw: 1, pack: 0, total: 2 },
      used: 1,
      lpPaid: 2,
      discarded: 1,
      transferred: 1,
    })
    expect(tiles.packs.parts.map((part) => part.count)).toEqual([0, 0, 0])
  })

  it("counts the marked cards on the DM's page", () => {
    const cards = [...active.slice(0, 2), draft, dmOnly, retired]
    const rows = setCardRows(cards, { holdings: [], packs: [] }, statusesOf(cards), NOW)
    expect(setTiles(rows, kesqer, [], testSetIndex).marked).toEqual({
      draft: 1,
      dmOnly: 1,
      retired: 1,
    })
  })
})

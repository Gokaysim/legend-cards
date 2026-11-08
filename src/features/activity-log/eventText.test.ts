import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'

import { deriveEvents, type LogEvent, type LogRecords } from './events'
import { describeEvent, sentenceText } from './eventText'

const NAMES: Record<string, string> = { ayla: 'Ayla', bora: 'Bora', cem: 'Cem', dana: 'Dana' }
const nameOf = (uid: string) => NAMES[uid] ?? 'İsimsiz oyuncu'

const eyes = testCard("Aboleth's Eyes")
const at = (millis: number) => Timestamp.fromMillis(millis)

function only(records: Partial<LogRecords>): LogEvent {
  const [event] = deriveEvents({ given: [], closed: [], draws: [], entries: [], ...records })
  if (!event) throw new Error('No event')
  return event
}

const text = (event: LogEvent, other?: Parameters<typeof describeEvent>[2]) =>
  sentenceText(describeEvent(event, nameOf, other))

const closed = (
  uid: string,
  by: string,
  reason: 'used' | 'discarded',
  usedOn: string | null = null,
) =>
  testHolding(eyes, uid, 1000, {
    id: `h-${uid}`,
    returnedAt: at(2000),
    returnedBy: by,
    returnReason: reason,
    usedOn,
  })

const oldSide = testHolding(eyes, 'ayla', 1000, {
  id: 'h-old',
  returnedAt: at(5000),
  returnedBy: 'dana',
  returnReason: 'transferred',
  transferredTo: 'h-new',
})
const newSide = testHolding(eyes, 'bora', 5000, {
  id: 'h-new',
  givenBy: 'dana',
  givenVia: 'transfer',
  transferredFrom: 'h-old',
})

describe('describeEvent', () => {
  it('describes a card the DM gave', () => {
    const event = only({ given: [testHolding(eyes, 'ayla', 1000, { givenBy: 'dana' })] })
    expect(text(event)).toBe("Aboleth's Eyes kartını Ayla'ya verdi.")
    expect(describeEvent(event, nameOf).parts[0]).toEqual({ card: "Aboleth's Eyes" })
  })

  it('describes a card its holder used, with and without a character', () => {
    expect(text(only({ closed: [closed('ayla', 'ayla', 'used', 'Thorin')] }))).toBe(
      "Aboleth's Eyes kartını Thorin üzerinde kullandı.",
    )
    expect(text(only({ closed: [closed('ayla', 'ayla', 'used')] }))).toBe(
      "Aboleth's Eyes kartını kullandı.",
    )
  })

  it("names the holder when the DM used another player's card", () => {
    expect(text(only({ closed: [closed('cem', 'dana', 'used', 'Thorin')] }))).toBe(
      "Cem'in Aboleth's Eyes kartını Thorin üzerinde kullandı.",
    )
  })

  it('describes a discarded card', () => {
    expect(text(only({ closed: [closed('ayla', 'dana', 'discarded')] }))).toBe(
      "Ayla'nın elinden Aboleth's Eyes kartını attı.",
    )
  })

  it('describes a transfer from both sides, or from one side and the holding read for the other', () => {
    const expected = "Aboleth's Eyes kartını Ayla'dan Bora'ya verdi."
    expect(text(only({ given: [newSide], closed: [oldSide] }))).toBe(expected)
    expect(text(only({ closed: [oldSide] }), newSide)).toBe(expected)
    expect(text(only({ given: [newSide] }), oldSide)).toBe(expected)
    // Until the other side is read, the sentence leaves out the name it cannot know.
    expect(text(only({ given: [newSide] }))).toBe("Aboleth's Eyes kartını Bora'ya verdi.")
  })

  it('describes an LP change with the balance before and after, and its reason', () => {
    const sentence = describeEvent(
      only({ entries: [testLedgerEntry(1000, { account: 'ayla' })] }),
      nameOf,
    )
    expect(sentenceText(sentence)).toBe('Ayla: +2 LP (5 → 7)')
    expect(sentence.reason).toBe("Boss'u yendi")
  })

  it('describes a GP change with digit grouping, and a subtraction with a minus sign', () => {
    expect(text(only({ entries: [testGpEntry(1000)] }))).toBe(
      'Grup kesesi: +5.000 GP (7.500 → 12.500)',
    )
    expect(
      text(only({ entries: [testGpEntry(1000, { delta: -2500, balanceAfter: 10000 })] })),
    ).toBe('Grup kesesi: −2.500 GP (12.500 → 10.000)')
  })
})

describe('describing draws', () => {
  const visions = testCursedCard('Visions of Death')

  it("describes a player's paid draw", () => {
    const event = only({ draws: [testDraw(eyes, 'ayla', 1000)] })
    expect(text(event)).toBe("Aboleth's Eyes kartını çekti (−1 LP).")
    expect(describeEvent(event, nameOf)).toEqual({
      parts: ['', { card: "Aboleth's Eyes" }, ' kartını çekti (−1 LP).'],
      reason: null,
    })
  })

  it("describes the DM's free draw into a player's hand, without and with filters", () => {
    expect(text(only({ draws: [testDmDraw(eyes, 'bora', 1000, { by: 'dana' })] }))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti.",
    )
    const filters = {
      cost: '2',
      mechanicPack: 'Blood & Battle',
      rarity: 'rare' as const,
      keyword: 'kan',
    }
    expect(text(only({ draws: [testDmDraw(eyes, 'bora', 1000, { by: 'dana', filters })] }))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti (filtre: Rare · Blood & Battle · Cost 2 · kelime “kan”).",
    )
    expect(
      text(
        only({
          draws: [
            testDmDraw(eyes, 'bora', 1000, {
              by: 'dana',
              filters: { cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
            }),
          ],
        }),
      ),
    ).toBe("Bora'ya Aboleth's Eyes kartını çekti (filtre: Rare).")
  })

  it("describes the DM's draw into the DM's own hand without a receiver", () => {
    expect(text(only({ draws: [testDmDraw(eyes, 'dana', 1000, { by: 'dana' })] }))).toBe(
      "Aboleth's Eyes kartını çekti.",
    )
  })

  it('describes a Cursed draw by the player and by the DM', () => {
    expect(text(only({ draws: [testDraw(visions, 'ayla', 1000)] }))).toBe(
      'Cursed kart çekti: Visions of Death.',
    )
    expect(text(only({ draws: [testDmDraw(visions, 'cem', 1000, { by: 'dana' })] }))).toBe(
      "Cem'e Cursed kart çekti: Visions of Death.",
    )
    expect(describeEvent(only({ draws: [testDraw(visions, 'ayla', 1000)] }), nameOf).parts).toEqual(
      ['Cursed kart çekti: ', { card: 'Visions of Death' }, '.'],
    )
  })
})

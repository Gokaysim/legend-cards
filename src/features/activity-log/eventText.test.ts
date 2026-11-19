import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testGpEntry, testLedgerEntry } from '@/test/ledgerFixtures'
import { testTrueWord, testWordDraft, testWordHolding, testWordUse } from '@/test/trueWordFixtures'
import { testSetChange, testSetName } from '@/test/setFixtures'
import { testDiceReset, testTableChange } from '@/test/tableFixtures'
import type { WordDraft } from '@/features/true-words/schema'

import { deriveEvents, EMPTY_LOG_RECORDS, type LogEvent, type LogRecords } from './events'
import { describeEvent, sentenceText } from './eventText'

const NAMES: Record<string, string> = { ayla: 'Ayla', bora: 'Bora', cem: 'Cem', dana: 'Dana' }
const nameOf = (uid: string) => NAMES[uid] ?? 'İsimsiz oyuncu'
const NAMES_OF = { nameOf, setName: testSetName }

const eyes = testCard("Aboleth's Eyes")
const at = (millis: number) => Timestamp.fromMillis(millis)

function only(records: Partial<LogRecords>): LogEvent {
  const [event] = deriveEvents({ ...EMPTY_LOG_RECORDS, ...records })
  if (!event) throw new Error('No event')
  return event
}

const text = (event: LogEvent, other?: Parameters<typeof describeEvent>[2]) =>
  sentenceText(describeEvent(event, NAMES_OF, other))

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
    expect(describeEvent(event, NAMES_OF).parts[0]).toEqual({ card: "Aboleth's Eyes" })
  })

  it('describes a card its holder used, with and without a character', () => {
    expect(text(only({ closed: [closed('ayla', 'ayla', 'used', 'Thorin')] }))).toBe(
      "Aboleth's Eyes kartını Thorin üzerinde kullandı.",
    )
    expect(text(only({ closed: [closed('ayla', 'ayla', 'used')] }))).toBe(
      "Aboleth's Eyes kartını kullandı.",
    )
  })

  it('shows the payment of a paid use, with and without a character, and none for a free use', () => {
    const paid = (usedOn: string | null) => ({
      ...closed('ayla', 'ayla', 'used', usedOn),
      useCost: 2,
      useEntryId: 'e-use',
    })
    expect(text(only({ closed: [paid('Thorin')] }))).toBe(
      "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP).",
    )
    expect(text(only({ closed: [paid(null)] }))).toBe("Aboleth's Eyes kartını kullandı (−2 LP).")
    expect(
      text(only({ closed: [{ ...closed('ayla', 'dana', 'used'), useCost: 0, useEntryId: null }] })),
    ).toBe("Ayla'nın Aboleth's Eyes kartını kullandı.")
  })

  it('names a stored character by the name the holding kept, whatever it is called now', () => {
    const onCharacter = {
      ...closed('ayla', 'ayla', 'used', 'Thorin'),
      usedOnCharacterId: 'ThorinAyla0123456789',
    }
    expect(text(only({ closed: [onCharacter] }))).toBe(
      "Aboleth's Eyes kartını Thorin üzerinde kullandı.",
    )
    // A typed name, and a holding closed before characters, have no character record.
    expect(text(only({ closed: [closed('ayla', 'ayla', 'used', 'Goblin şefi')] }))).toBe(
      "Aboleth's Eyes kartını Goblin şefi üzerinde kullandı.",
    )
  })

  it("names the holder when the DM used another player's card", () => {
    expect(text(only({ closed: [closed('cem', 'dana', 'used', 'Thorin')] }))).toBe(
      "Cem'in Aboleth's Eyes kartını Thorin üzerinde kullandı.",
    )
  })

  it('describes a discarded card, without the hand when its holder discarded it', () => {
    expect(text(only({ closed: [closed('ayla', 'dana', 'discarded')] }))).toBe(
      "Ayla'nın elinden Aboleth's Eyes kartını attı.",
    )
    const own = only({ closed: [closed('ayla', 'ayla', 'discarded')] })
    expect(own.by).toBe('ayla')
    expect(text(own)).toBe("Aboleth's Eyes kartını attı.")
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
      NAMES_OF,
    )
    expect(sentenceText(sentence)).toBe('Ayla: +2 LP (5 → 7)')
    expect(sentence.reason).toBe("Boss'u yendi")
  })

  it("describes a player's own LP change by hand, made by that player", () => {
    const event = only({
      entries: [
        testLedgerEntry(1000, {
          account: 'ayla',
          by: 'ayla',
          delta: -1,
          balanceAfter: 4,
          reason: 'd20 avantajı',
        }),
      ],
    })
    expect(event.by).toBe('ayla')
    const sentence = describeEvent(event, NAMES_OF)
    expect(sentenceText(sentence)).toBe('Ayla: −1 LP (5 → 4)')
    expect(sentence.reason).toBe('d20 avantajı')
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
    expect(describeEvent(event, NAMES_OF)).toEqual({
      parts: ['', { card: "Aboleth's Eyes" }, ' kartını çekti (−1 LP).'],
      reason: null,
    })
  })

  it("describes the DM's free draw into a player's hand, without and with filters", () => {
    expect(text(only({ draws: [testDmDraw(eyes, 'bora', 1000, { by: 'dana' })] }))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti.",
    )
    const filters = {
      setCode: null,
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
              filters: {
                setCode: null,
                cost: null,
                mechanicPack: null,
                rarity: 'rare',
                keyword: null,
              },
            }),
          ],
        }),
      ),
    ).toBe("Bora'ya Aboleth's Eyes kartını çekti (filtre: Rare).")
  })

  it('names the price paid, also when the DM charged it, and no payment for a free draw', () => {
    expect(text(only({ draws: [testDraw(eyes, 'bora', 1000, { by: 'dana', cost: 2 })] }))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti (−2 LP).",
    )
    expect(text(only({ draws: [testDraw(eyes, 'ayla', 1000, { cost: 3 })] }))).toBe(
      "Aboleth's Eyes kartını çekti (−3 LP).",
    )
    expect(
      text(
        only({
          draws: [testDraw(eyes, 'ayla', 1000, { paidWith: 'none', cost: 0, entryId: null })],
        }),
      ),
    ).toBe("Aboleth's Eyes kartını çekti.")
  })

  it("describes a player's filtered paid draw with its payment and its filters", () => {
    const filters = {
      setCode: 'Kesqer',
      cost: null,
      mechanicPack: null,
      rarity: null,
      keyword: 'eyes',
    }
    expect(text(only({ draws: [testDraw(eyes, 'ayla', 1000, { filters })] }))).toBe(
      "Aboleth's Eyes kartını çekti (−1 LP; filtre: Kesqerian Nights · kelime “eyes”).",
    )
  })

  it("names a draw's set filter by the set's official name, or by its code without a stored set", () => {
    const setDraw = (setCode: string) =>
      only({
        draws: [
          testDmDraw(eyes, 'bora', 1000, {
            by: 'dana',
            filters: { setCode, cost: null, mechanicPack: null, rarity: 'rare', keyword: null },
          }),
        ],
      })
    expect(text(setDraw('Kesqer'))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti (filtre: Kesqerian Nights · Rare).",
    )
    expect(text(setDraw('Atlantis'))).toBe(
      "Bora'ya Aboleth's Eyes kartını çekti (filtre: Atlantis · Rare).",
    )
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
    expect(
      describeEvent(only({ draws: [testDraw(visions, 'ayla', 1000)] }), NAMES_OF).parts,
    ).toEqual(['Cursed kart çekti: ', { card: 'Visions of Death' }, '.'])
  })
})

describe('describeEvent: True Words', () => {
  const abyss = testTrueWord('Abyss')
  const draft = (overrides: Partial<WordDraft> = {}) =>
    testWordDraft('w1', 'ayla', [abyss, testTrueWord('Aid'), testTrueWord('Dragon')], {
      cost: 3,
      ...overrides,
    })
  const learned = {
    status: 'learned' as const,
    closedAt: at(2000),
    closedBy: 'ayla',
    learned: { cardId: abyss.id, cardName: 'Abyss', holdingId: 'r1' },
  }

  it("describes a player's open draft, then the word learned from it", () => {
    expect(text(only({ draws: [draft()] }))).toBe("True Word draft'ı açıyor (−3 LP).")
    expect(text(only({ draws: [draft(learned)] }))).toBe(
      "True Word draft'ı açtı ve Abyss True Word'ünü öğrendi (−3 LP).",
    )
    expect(describeEvent(only({ draws: [draft(learned)] }), NAMES_OF).parts).toContainEqual({
      card: 'Abyss',
    })
  })

  it('names the player when the DM started the draft, and says when the DM learned for them', () => {
    expect(text(only({ draws: [draft({ by: 'dana', ...learned, closedBy: 'dana' })] }))).toBe(
      "Ayla için True Word draft'ı açtı ve Abyss True Word'ünü öğrendi (seçimi DM yaptı) (−3 LP).",
    )
  })

  it('says who skipped a draft, and that a free one was free', () => {
    const skipped = { status: 'skipped' as const, closedAt: at(2000) }
    expect(
      text(
        only({
          draws: [
            draft({
              uid: 'bora',
              by: 'dana',
              paidWith: 'none',
              cost: 0,
              entryId: null,
              ...skipped,
              closedBy: 'bora',
            }),
          ],
        }),
      ),
    ).toBe("Bora için True Word draft'ı açtı (ücretsiz); Bora pas geçti.")
    expect(text(only({ draws: [draft({ ...skipped, closedBy: 'dana' })] }))).toBe(
      "True Word draft'ı açtı (−3 LP); DM pas geçti.",
    )
  })

  it('says that the DM cancelled a draft and refunded it', () => {
    expect(
      text(
        only({
          draws: [
            draft({
              status: 'cancelled',
              closedAt: at(2000),
              closedBy: 'dana',
              refundEntryId: 'e2',
            }),
          ],
        }),
      ),
    ).toBe("True Word draft'ı açtı (−3 LP); DM iptal etti, 3 LP iade edildi.")
  })

  it('describes a word the DM taught, and one the DM took back', () => {
    const holding = testWordHolding('r1', abyss, 'bora')
    expect(text(only({ given: [holding] }))).toBe("Bora'ya Abyss True Word'ünü öğretti.")
    const takenBack = {
      ...holding,
      returnedAt: at(3000),
      returnedBy: 'dana',
      returnReason: 'discarded' as const,
    }
    expect(text(only({ closed: [takenBack] }))).toBe("Bora'dan Abyss True Word'ünü geri aldı.")
  })

  it('names the character a word was used on, paid or free', () => {
    const paid = testWordUse('u1', abyss, 'ayla', {
      cost: 5,
      usedOn: 'Thorin',
      usedOnCharacterId: 'ThorinAyla0123456789',
    })
    expect(text(only({ uses: [paid] }))).toBe(
      "Abyss True Word'ünü Thorin üzerinde kullandı (−5 LP).",
    )
    const free = testWordUse('u2', abyss, 'ayla', { cost: 0, entryId: null, usedOn: 'Goblin şefi' })
    expect(text(only({ uses: [free] }))).toBe("Abyss True Word'ünü Goblin şefi üzerinde kullandı.")
  })

  it("describes a player's use of their word, with its payment", () => {
    const event = only({ uses: [testWordUse('u1', abyss, 'ayla', { cost: 5 })] })
    expect(text(event)).toBe("Abyss True Word'ünü kullandı (−5 LP).")
    expect(describeEvent(event, NAMES_OF).parts).toContainEqual({ card: 'Abyss' })
  })

  it('names the player when the DM used their word, and shows no payment for a free use', () => {
    expect(text(only({ uses: [testWordUse('u1', abyss, 'ayla', { by: 'dana', cost: 5 })] }))).toBe(
      "Ayla'nın Abyss True Word'ünü kullandı (−5 LP).",
    )
    expect(
      text(only({ uses: [testWordUse('u1', abyss, 'ayla', { cost: 0, entryId: null })] })),
    ).toBe("Abyss True Word'ünü kullandı.")
  })
})

describe('describing player draw mode changes', () => {
  it.each([
    ['off', 'filtered', 'oyuncu kart çekişini “Filtreli çekiş” yaptı.'],
    ['filtered', 'pick', 'oyuncu kart çekişini “Kart seçme” yaptı.'],
    ['pick', 'off', 'oyuncu kart çekişini “Kapalı” yaptı.'],
  ] as const)('describes %s → %s', (before, after, text) => {
    const change = testTableChange(1000, { before, after })
    expect(sentenceText(describeEvent(only({ tableChanges: [change] }), NAMES_OF))).toBe(text)
  })
})

describe('describing dice channel resets', () => {
  it.each([
    [142, 'zar kanalını sıfırladı: 142 atış.'],
    [0, 'zar kanalını sıfırladı: 0 atış.'],
  ] as const)('describes a reset of %i rolls', (rolls, text) => {
    const reset = testDiceReset(1000, rolls)
    expect(sentenceText(describeEvent(only({ tableChanges: [reset] }), NAMES_OF))).toBe(text)
  })
})

describe('describing fights', () => {
  it.each([
    ['start', 6, 'savaşı başlattı: 6 katılımcı.'],
    ['end', 5, 'savaşı bitirdi: 5 tur.'],
  ] as const)('describes the %s', (step, count, text) => {
    const change = { id: `f-${step}`, by: 'dm-1', at: Timestamp.fromMillis(1000), step, count }
    const event = describeEvent(only({ combatChanges: [change] }), NAMES_OF)
    expect(sentenceText(event)).toBe(text)
  })
})

describe('describing DM role changes', () => {
  const roleChange = (target: string, before: 'player' | 'dm', after: 'player' | 'dm') => ({
    id: `r-${target}`,
    by: 'dana',
    at: Timestamp.fromMillis(1000),
    target,
    before,
    after,
  })

  it.each([
    [roleChange('ayla', 'player', 'dm'), "Ayla'yı DM yaptı."],
    [roleChange('cem', 'player', 'dm'), "Cem'i DM yaptı."],
    [roleChange('ayla', 'dm', 'player'), "Ayla'nın DM'liğini aldı."],
    [{ ...roleChange('dana', 'dm', 'player'), otherDm: 'ayla' }, "DM'likten çıktı."],
  ])('describes %o', (change, expected) => {
    const event = only({ roleChanges: [change] })
    expect(event).toMatchObject({ kind: 'role', by: 'dana' })
    expect(sentenceText(describeEvent(event, NAMES_OF))).toBe(expected)
  })
})

describe('describing set changes', () => {
  const setEvent = (change: Parameters<typeof testSetChange>[1]) =>
    describeEvent(only({ setChanges: [testSetChange(1000, change)] }), NAMES_OF)

  it('names an edit and its changed fields, never their values', () => {
    const sentence = setEvent({ fields: ['name', 'cardback'] })
    expect(sentenceText(sentence)).toBe('Ballad of Ulagal setini düzenledi.')
    expect(sentence.lines).toEqual(['Ad, Cardback'])
  })

  it.each([
    [{ step: 'added' as const, fields: [] }, 'Ballad of Ulagal setini ekledi.'],
    [
      { step: 'moved' as const, direction: 'up' as const },
      'Ballad of Ulagal setini sırada yukarı taşıdı.',
    ],
    [
      { step: 'moved' as const, direction: 'down' as const },
      'Ballad of Ulagal setini sırada aşağı taşıdı.',
    ],
    [{ step: 'deleted' as const }, 'Ballad of Ulagal setini sildi.'],
  ])('describes %o', (change, text) => {
    expect(sentenceText(setEvent(change))).toBe(text)
  })

  it('describes the set import with the sets it added and gave pictures', () => {
    const sentence = setEvent({
      step: 'imported',
      by: null,
      setId: null,
      code: null,
      name: null,
      fields: [],
      added: ['Kesqerian Nights', 'Pandemonium'],
      pictured: ['Kesqerian Nights'],
    })
    expect(sentenceText(sentence)).toBe('2 set ekledi; 1 sete resim ekledi.')
    expect(sentence.names).toEqual(['Kesqerian Nights', 'Pandemonium'])
  })
})

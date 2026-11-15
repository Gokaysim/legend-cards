import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { testDmDraw, testDraw } from '@/test/drawFixtures'
import { testHolding } from '@/test/holdingFixtures'
import { testPack } from '@/test/packFixtures'

import type { HistoryRow } from './cardHistory'
import { describeHistoryRow, type HistoryNames } from './historyText'

const card = testCard("Aboleth's Eyes")
const curse = testCursedCard('Abandon All Hope')
const NAMES: Record<string, string> = { 'dm-1': 'DM', ayla: 'Ayla', bora: 'Bora', dana: 'Dana' }
const names = (overrides: Partial<HistoryNames> = {}): HistoryNames => ({
  nameOf: (uid) => NAMES[uid] ?? 'İsimsiz oyuncu',
  setName: (code) => (code === 'Kesqer' ? 'Kesqerian Nights' : code),
  card,
  ...overrides,
})
const at = Timestamp.fromMillis(1000)

const given = testHolding(card, 'dana', 1000, { id: 'h-1' })
const closed = (overrides: Parameters<typeof testHolding>[3]) =>
  testHolding(card, 'ayla', 1000, {
    id: 'h-2',
    returnedAt: at,
    returnedBy: 'ayla',
    ...overrides,
  })

function wordsOf(row: HistoryRow, overrides?: Partial<HistoryNames>) {
  return describeHistoryRow(row, names(overrides))
}

describe('describeHistoryRow', () => {
  it("words the DM's give", () => {
    expect(wordsOf({ key: 'k', at, kind: 'given', holding: given })).toEqual({
      text: "DM, Dana'ya verdi",
      details: 'Kart ver',
      tone: 'given',
    })
  })

  it("words a player's paid draw, a Cursed draw and the DM's free draw", () => {
    const holding = testHolding(card, 'bora', 1000, { givenBy: 'bora', givenVia: 'draw' })
    expect(
      wordsOf({ key: 'k', at, kind: 'drawn', holding, draw: testDraw(card, 'bora', 1000) }),
    ).toMatchObject({ text: 'Bora çekti', details: 'Rastgele çekiliş · 1 LP', tone: 'given' })

    const cursed = testHolding(curse, 'bora', 1000, { givenBy: 'bora', givenVia: 'draw' })
    expect(
      wordsOf(
        { key: 'k', at, kind: 'drawn', holding: cursed, draw: testDraw(curse, 'bora', 1000) },
        { card: curse },
      ),
    ).toMatchObject({ text: 'Bora çekti', details: 'Cursed çekiliş' })

    const dmHolding = testHolding(card, 'bora', 1000, { givenVia: 'draw' })
    expect(
      wordsOf({
        key: 'k',
        at,
        kind: 'drawn',
        holding: dmHolding,
        draw: testDmDraw(card, 'bora', 1000),
      }),
    ).toMatchObject({ text: "DM, Bora'nın eline çekti", details: 'Rastgele çekiliş · ücretsiz' })
  })

  it('words a pack choice with who opened the pack', () => {
    const pack = testPack('ayla', { packType: 'premium', by: 'ayla' })
    const holding = testHolding(card, 'ayla', 1000, { givenBy: 'ayla', givenVia: 'pack' })
    expect(wordsOf({ key: 'k', at, kind: 'fromPack', holding, pack })).toEqual({
      text: "Ayla, Kesqerian Nights Premium Pack'ten seçti",
      details: "Pack'i Ayla açtı",
      tone: 'given',
    })
    expect(
      wordsOf({ key: 'k', at, kind: 'fromPack', holding, pack: { ...pack, by: 'dm-1' } }),
    ).toMatchObject({ details: "Pack'i DM açtı" })
  })

  it("words the Cursed card of a Cursed Pack's choice", () => {
    const pack = testPack('ayla', { packType: 'cursed' })
    const holding = testHolding(curse, 'ayla', 1000, { givenBy: 'ayla', givenVia: 'pack' })
    expect(wordsOf({ key: 'k', at, kind: 'fromPack', holding, pack }, { card: curse })).toEqual({
      text: "Kesqerian Nights Cursed Pack ile Ayla'nın eline geçti",
      details: null,
      tone: 'given',
    })
  })

  it('words a use with the character, the LP and the return to the pool', () => {
    const holding = closed({ returnReason: 'used', usedOn: 'Kael', useCost: 1 })
    expect(wordsOf({ key: 'k', at, kind: 'used', holding })).toEqual({
      text: 'Ayla kullandı',
      details: 'Kael üzerinde · 1 LP · kart havuza döndü',
      tone: 'used',
    })
  })

  it("words the DM's use of a player's card, free", () => {
    const holding = closed({ returnReason: 'used', returnedBy: 'dm-1', useCost: 0 })
    expect(wordsOf({ key: 'k', at, kind: 'used', holding })).toMatchObject({
      text: "DM, Ayla'nın kartını kullandı",
      details: 'ücretsiz · kart havuza döndü',
    })
  })

  it('says "kart havuza döndü" only for a normal card that is not DM-only', () => {
    const holding = closed({ returnReason: 'used', usedOn: 'Kael', useCost: 1 })
    const row: HistoryRow = { key: 'k', at, kind: 'used', holding }
    expect(wordsOf(row, { card: testBlessedCard('Second Wind') }).details).toBe(
      'Kael üzerinde · 1 LP',
    )
    expect(wordsOf(row, { card: curse }).details).toBe('Kael üzerinde · 1 LP')
    expect(wordsOf(row, { card: testCard('The Last Wish', { dmOnly: true }) }).details).toBe(
      'Kael üzerinde · 1 LP',
    )
  })

  it('words a discard with who closed it', () => {
    const holding = closed({ returnReason: 'discarded', returnedBy: 'dm-1' })
    expect(wordsOf({ key: 'k', at, kind: 'discarded', holding })).toEqual({
      text: "Ayla'nın elinden discard edildi",
      details: 'DM · kart havuza döndü',
      tone: 'discarded',
    })
  })

  it('words a transfer from one hand to another', () => {
    const holding = testHolding(card, 'bora', 1000, {
      returnedAt: at,
      returnedBy: 'dm-1',
      returnReason: 'transferred',
      transferredTo: 'h-new',
    })
    const receiver = testHolding(card, 'ayla', 1000, { id: 'h-new', givenVia: 'transfer' })
    expect(wordsOf({ key: 'k', at, kind: 'transferred', holding, receiver })).toEqual({
      text: "Bora'dan Ayla'ya transfer edildi",
      details: 'DM',
      tone: 'transferred',
    })
    expect(wordsOf({ key: 'k', at, kind: 'transferred', holding, receiver: undefined }).text).toBe(
      "Bora'nın elinden transfer edildi",
    )
  })

  it('words a pack that showed the card: not chosen, cancelled or still open', () => {
    const chosen = testPack('bora', { status: 'chosen' })
    expect(wordsOf({ key: 'k', at, kind: 'seen', pack: chosen })).toEqual({
      text: "Bora'nın Kesqerian Nights Standard Pack'inde göründü",
      details: 'Seçilmedi',
      tone: 'seen',
    })
    expect(
      wordsOf({ key: 'k', at, kind: 'seen', pack: { ...chosen, status: 'cancelled' } }).details,
    ).toBe('Pack iptal edildi')
    expect(
      wordsOf({ key: 'k', at, kind: 'seen', pack: { ...chosen, status: 'open' } }).details,
    ).toBe('Pack açık')
  })
})

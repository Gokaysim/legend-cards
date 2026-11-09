import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import {
  draftPrice,
  EMPTY_PLAYER_WORDS,
  isKnown,
  type LearnedWord,
  learnedWordSchema,
  playerWordsSchema,
  trueWordSchema,
  wordDraftSchema,
} from './schema'

const at = Timestamp.fromMillis(1000)

describe('draftPrice', () => {
  it('is 1 LP plus the number of words the player knows', () => {
    expect(draftPrice(0)).toBe(1)
    expect(draftPrice(2)).toBe(3)
  })
})

describe('trueWordSchema', () => {
  const abyss = {
    name: 'Abyss',
    nameKey: 'abyss',
    cost: '5',
    text: 'Once per turn, a random card of yours is free to play.',
    retired: false,
  }

  it.each([
    ['a word', abyss],
    ['an X cost', { ...abyss, cost: 'X' }],
    ['an empty text', { ...abyss, text: '' }],
    ['a retired word', { ...abyss, retired: true }],
  ])('accepts %s', (_case, word) => {
    expect(trueWordSchema.safeParse(word).success).toBe(true)
  })

  it.each([
    ['an empty cost', { ...abyss, cost: '' }],
    ['a cost over 10 characters', { ...abyss, cost: '12345678901' }],
    ['a missing retired flag', { ...abyss, retired: undefined }],
  ])('rejects %s', (_case, word) => {
    expect(trueWordSchema.safeParse(word).success).toBe(false)
  })
})

describe('learnedWordSchema', () => {
  const fromDraft = {
    wordId: 'tw-abyss',
    wordName: 'Abyss',
    uid: 'ayla',
    learnedAt: at,
    learnedBy: 'ayla',
    learnedVia: 'draft',
    draftId: 'd1',
    active: false,
    removedAt: null,
    removedBy: null,
  }
  const taught = { ...fromDraft, learnedBy: 'dana', learnedVia: 'dm', draftId: null }

  it.each([
    ['a word learned from a draft', fromDraft],
    ['a word the DM taught', taught],
    ['a word taken back', { ...taught, removedAt: at, removedBy: 'dana' }],
    ['a take-back whose server time is pending', { ...taught, removedBy: 'dana' }],
    ['a learning whose server time is pending', { ...fromDraft, learnedAt: null }],
  ])('accepts %s', (_case, record) => {
    expect(learnedWordSchema.safeParse(record).success).toBe(true)
  })

  it.each([
    ['a draft word without its draft', { ...fromDraft, draftId: null }],
    ['a taught word that names a draft', { ...taught, draftId: 'd1' }],
    ['a take-back time without who took it back', { ...taught, removedAt: at }],
    ['an unknown way of learning', { ...taught, learnedVia: 'pack' }],
  ])('rejects %s', (_case, record) => {
    expect(learnedWordSchema.safeParse(record).success).toBe(false)
  })

  it('reads a record as known until the DM takes it back', () => {
    const record = { ...learnedWordSchema.parse(taught), id: 'r1' } satisfies LearnedWord
    expect(isKnown(record)).toBe(true)
    expect(isKnown({ ...record, removedBy: 'dana' })).toBe(false)
  })
})

describe('playerWordsSchema', () => {
  it('accepts the known words with their records and an open draft', () => {
    const state = { known: { 'tw-abyss': 'r1' }, openDraftId: 'd2', recordId: 'r1' }
    expect(playerWordsSchema.safeParse(state).success).toBe(true)
  })

  it('reads a missing document as knowing nothing, with no open draft', () => {
    expect(EMPTY_PLAYER_WORDS).toEqual({ known: {}, openDraftId: null, recordId: null })
    expect(playerWordsSchema.safeParse(EMPTY_PLAYER_WORDS).success).toBe(true)
  })

  it('rejects a known word without its record', () => {
    expect(
      playerWordsSchema.safeParse({ known: { 'tw-abyss': '' }, openDraftId: null, recordId: null })
        .success,
    ).toBe(false)
  })
})

describe('wordDraftSchema', () => {
  const open = {
    uid: 'ayla',
    by: 'ayla',
    at,
    offered: ['tw-abyss', 'tw-aid', 'tw-dragon'],
    status: 'open',
    paidWith: 'lp',
    cost: 3,
    entryId: 'e1',
    closedAt: null,
    closedBy: null,
    learned: null,
    refundEntryId: null,
  }
  const free = { ...open, by: 'dana', paidWith: 'none', cost: 0, entryId: null }
  const learned = {
    ...open,
    status: 'learned',
    closedAt: at,
    closedBy: 'ayla',
    learned: { wordId: 'tw-abyss', wordName: 'Abyss', recordId: 'r1' },
  }
  const skipped = { ...open, status: 'skipped', closedAt: at, closedBy: 'ayla' }
  const cancelled = {
    ...open,
    status: 'cancelled',
    closedAt: at,
    closedBy: 'dana',
    refundEntryId: 'e2',
  }

  it.each([
    ["a player's paid open draft", open],
    ["the DM's free open draft", free],
    ['a learned draft', learned],
    ['a skipped draft, without a refund', skipped],
    ['a cancelled paid draft, with its refund', cancelled],
    [
      'a cancelled free draft, without a refund',
      { ...free, status: 'cancelled', closedAt: at, closedBy: 'dana' },
    ],
    ['an ended draft whose server time is pending', { ...skipped, closedAt: null }],
  ])('accepts %s', (_case, draft) => {
    expect(wordDraftSchema.safeParse(draft).success).toBe(true)
  })

  it.each([
    ['2 words', { ...open, offered: ['tw-abyss', 'tw-aid'] }],
    ['4 words', { ...open, offered: ['tw-abyss', 'tw-aid', 'tw-dragon', 'tw-chaos'] }],
    ['a word shown twice', { ...open, offered: ['tw-abyss', 'tw-abyss', 'tw-aid'] }],
    ['a paid draft without its entry', { ...open, entryId: null }],
    ['a paid draft that costs 0', { ...open, cost: 0 }],
    ['a free draft that costs LP', { ...free, cost: 2 }],
    ['a GP payment', { ...open, paidWith: 'gp' }],
    ['an open draft that names who ended it', { ...open, closedBy: 'ayla' }],
    ['an open draft with an end time', { ...open, closedAt: at }],
    ['an open draft with a learned word', { ...open, learned: learned.learned }],
    ['a learned draft without its word', { ...learned, learned: null }],
    ['a skipped draft with a learned word', { ...skipped, learned: learned.learned }],
    [
      'a learned word that was not shown',
      { ...learned, learned: { wordId: 'tw-chaos', wordName: 'Chaos', recordId: 'r1' } },
    ],
    ['a cancelled paid draft without its refund', { ...cancelled, refundEntryId: null }],
    ['a skipped draft with a refund', { ...skipped, refundEntryId: 'e2' }],
    ['an ended draft without who ended it', { ...skipped, closedBy: null }],
  ])('rejects %s', (_case, draft) => {
    expect(wordDraftSchema.safeParse(draft).success).toBe(false)
  })
})

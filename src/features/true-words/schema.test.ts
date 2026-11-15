import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { keptUseSchema } from '@/features/hands/schema'
import { testHolding } from '@/test/holdingFixtures'
import { testTrueWord } from '@/test/trueWordFixtures'

import {
  draftPrice,
  EMPTY_PLAYER_WORDS,
  isKnown,
  learnedWordOf,
  playerWordsSchema,
  wordDraftSchema,
} from './schema'

const at = Timestamp.fromMillis(1000)

describe('draftPrice', () => {
  it('is 1 LP plus the number of words the player knows', () => {
    expect(draftPrice(0)).toBe(1)
    expect(draftPrice(2)).toBe(3)
  })
})

describe('learnedWordOf', () => {
  const abyss = testTrueWord('Abyss')

  it('reads a holding taught by the DM as a known word', () => {
    const holding = testHolding(abyss, 'ayla', 1000, {
      id: 'h1',
      givenBy: 'dana',
      note: 'Sonra',
      costOverride: '3',
    })
    expect(learnedWordOf(holding)).toEqual({
      id: 'h1',
      wordId: 'tw-abyss',
      wordName: 'Abyss',
      uid: 'ayla',
      learnedAt: holding.givenAt,
      learnedBy: 'dana',
      learnedVia: 'dm',
      draftId: null,
      active: false,
      note: 'Sonra',
      costOverride: '3',
      removedAt: null,
      removedBy: null,
    })
  })

  it('reads a holding from a draft as learned from it', () => {
    const holding = testHolding(abyss, 'ayla', 1000, { givenVia: 'draft', drawId: 'd1' })
    expect(learnedWordOf(holding)).toMatchObject({ learnedVia: 'draft', draftId: 'd1' })
  })

  it('reads a word as known until the DM takes it back', () => {
    const known = learnedWordOf(testHolding(abyss, 'ayla', 1000))
    expect(isKnown(known)).toBe(true)
    const takenBack = learnedWordOf(
      testHolding(abyss, 'ayla', 1000, {
        returnedAt: at,
        returnedBy: 'dana',
        returnReason: 'discarded',
      }),
    )
    expect(isKnown(takenBack)).toBe(false)
  })
})

describe('playerWordsSchema', () => {
  it('accepts the known words with their holdings and an open draft', () => {
    const state = { known: { 'tw-abyss': 'r1' }, openDraftId: 'd2', holdingId: 'r1' }
    expect(playerWordsSchema.safeParse(state).success).toBe(true)
  })

  it('reads a missing document as knowing nothing, with no open draft', () => {
    expect(EMPTY_PLAYER_WORDS).toEqual({ known: {}, openDraftId: null, holdingId: null })
    expect(playerWordsSchema.safeParse(EMPTY_PLAYER_WORDS).success).toBe(true)
  })

  it('rejects a known word without its holding', () => {
    expect(
      playerWordsSchema.safeParse({ known: { 'tw-abyss': '' }, openDraftId: null, holdingId: null })
        .success,
    ).toBe(false)
  })
})

describe('wordDraftSchema', () => {
  const open = {
    kind: 'wordDraft',
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
    learned: { cardId: 'tw-abyss', cardName: 'Abyss', holdingId: 'r1' },
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
      { ...learned, learned: { cardId: 'tw-chaos', cardName: 'Chaos', holdingId: 'r1' } },
    ],
    ['a cancelled paid draft without its refund', { ...cancelled, refundEntryId: null }],
    ['a skipped draft with a refund', { ...skipped, refundEntryId: 'e2' }],
    ['an ended draft without who ended it', { ...skipped, closedBy: null }],
    ['a draft without its kind', { ...open, kind: undefined }],
  ])('rejects %s', (_case, draft) => {
    expect(wordDraftSchema.safeParse(draft).success).toBe(false)
  })
})

describe('keptUseSchema (a True Word use)', () => {
  const paid = {
    uid: 'ayla',
    cardId: 'tw-abyss',
    cardName: 'Abyss',
    cardKind: 'trueWord',
    holdingId: 'r1',
    by: 'ayla',
    at,
    cost: 5,
    entryId: 'e1',
  }

  it.each([
    ['a paid use', paid],
    ['a free use', { ...paid, cost: 0, entryId: null }],
    ['a use whose server time is still pending', { ...paid, at: null }],
    [
      'a use on a character',
      { ...paid, usedOn: 'Thorin', usedOnCharacterId: 'ThorinAyla0123456789' },
    ],
    ['a use on a typed name', { ...paid, usedOn: 'Goblin şefi', usedOnCharacterId: null }],
  ])('accepts %s', (_case, use) => {
    expect(keptUseSchema.safeParse(use).success).toBe(true)
  })

  it.each([
    ['a paid use without its entry', { ...paid, entryId: null }],
    ['a free use that names an entry', { ...paid, cost: 0 }],
    ['a negative cost', { ...paid, cost: -1 }],
    ['a fractional cost', { ...paid, cost: 1.5 }],
    ['a use without its holding', { ...paid, holdingId: '' }],
    ['a character without its name', { ...paid, usedOnCharacterId: 'ThorinAyla0123456789' }],
    ['an empty name', { ...paid, usedOn: '' }],
    ['a name over 100 characters', { ...paid, usedOn: 'x'.repeat(101) }],
  ])('rejects %s', (_case, use) => {
    expect(keptUseSchema.safeParse(use).success).toBe(false)
  })

  it('reads a use without a character as one without a character', () => {
    const result = keptUseSchema.safeParse(paid)
    expect(result.success && [result.data.usedOn, result.data.usedOnCharacterId]).toEqual([
      null,
      null,
    ])
  })
})

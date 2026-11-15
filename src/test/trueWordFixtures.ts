import { Timestamp } from 'firebase/firestore'

import { startingFlagsOf } from '@/features/cards/schema'
import type { Holding, KeptUse } from '@/features/hands/schema'
import type { LearnedWord, TrueWord, WordDraft } from '@/features/true-words/schema'
import { testHolding } from '@/test/holdingFixtures'

/** A test key from a name: lowercase letters and digits only, like the import's `nameKey`. */
const keyOf = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')

/** A True Word for tests: cost "1", active, unless overridden. Its ID is `tw-` plus its key. */
export function testTrueWord(
  name: string,
  overrides: Partial<Omit<TrueWord, 'name'>> = {},
): TrueWord {
  return {
    id: `tw-${keyOf(name)}`,
    kind: 'trueWord',
    name,
    nameKey: keyOf(name),
    setCode: null,
    cost: '1',
    rarity: null,
    mechanicPack: null,
    text: `${name} text.`,
    status: 'active',
    changeId: null,
    picture: null,
    holder: null,
    ...startingFlagsOf('trueWord', overrides.text ?? ''),
    ...overrides,
  }
}

/** A known word for tests: taught by the DM ("dana") long ago, inactive, unless overridden. */
export function testLearnedWord(
  id: string,
  word: TrueWord,
  uid: string,
  overrides: Partial<LearnedWord> = {},
): LearnedWord {
  return {
    id,
    wordId: word.id,
    wordName: word.name,
    uid,
    learnedAt: Timestamp.fromMillis(1000),
    learnedBy: 'dana',
    learnedVia: 'dm',
    draftId: null,
    active: false,
    note: '',
    costOverride: null,
    removedAt: null,
    removedBy: null,
    ...overrides,
  }
}

/** An open draft for tests: the player's own, paid with 1 LP, showing the given words. */
export function testWordDraft(
  id: string,
  uid: string,
  offered: readonly TrueWord[],
  overrides: Partial<WordDraft> = {},
): WordDraft {
  return {
    id,
    kind: 'wordDraft',
    uid,
    by: uid,
    at: Timestamp.fromMillis(5000),
    offered: offered.map((word) => word.id),
    status: 'open',
    paidWith: 'lp',
    cost: 1,
    entryId: `${id}-entry`,
    closedAt: null,
    closedBy: null,
    learned: null,
    refundEntryId: null,
    ...overrides,
  }
}

/**
 * A use of a known word for tests (a kept use): by its player at 4000, paying 1 LP with the entry `e-<id>`, unless
 * overridden. Its holding is `r-<uid>-<word ID>`.
 */
export function testWordUse(
  id: string,
  word: TrueWord,
  uid: string,
  overrides: Partial<KeptUse> = {},
): KeptUse {
  return {
    id,
    uid,
    cardId: word.id,
    cardName: word.name,
    cardKind: 'trueWord',
    holdingId: `r-${uid}-${word.id}`,
    by: uid,
    at: Timestamp.fromMillis(4000),
    cost: 1,
    entryId: `e-${id}`,
    usedOn: null,
    usedOnCharacterId: null,
    ...overrides,
  }
}

/**
 * The open holding of a known word for tests: taught by the DM ("dana") at 1000, inactive, with the ID `id`, unless
 * overridden.
 */
export function testWordHolding(
  id: string,
  word: TrueWord,
  uid: string,
  overrides: Partial<Holding> = {},
): Holding {
  return testHolding(word, uid, 1000, { id, givenBy: 'dana', ...overrides })
}

import { Timestamp } from 'firebase/firestore'

import type { LearnedWord, TrueWord, WordDraft } from '@/features/true-words/schema'

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
    name,
    nameKey: keyOf(name),
    cost: '1',
    text: `${name} text.`,
    status: 'active',
    changeId: null,
    picture: null,
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

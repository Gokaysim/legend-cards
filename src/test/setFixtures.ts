import { Timestamp } from 'firebase/firestore'

import { setIdOf, setIndex } from '@/features/sets/index'
import type { CardSet, SetChange } from '@/features/sets/schema'

import { testPicturePath } from './artFixtures'

/** A stored set for tests: no aliases, the standard layout and no pictures unless overridden. */
export function testSet(
  code: string,
  name: string,
  position: number,
  overrides: Partial<CardSet> = {},
): CardSet {
  return {
    id: setIdOf(code),
    code,
    name,
    aliases: [],
    position,
    packLayout: 'standard',
    cardback: null,
    mascot: null,
    changeId: `c-${setIdOf(code)}`,
    ...overrides,
  }
}

/** The 12 sets as `data/sets.csv` imports them, in the shop order, without pictures. */
export const TEST_SETS: readonly CardSet[] = [
  testSet('The End is Nigh', 'The End is Nigh', 1, { aliases: ['endisnigh'] }),
  testSet('Pentagon', 'Conclave at Pentagon', 2),
  testSet('Rhodelen', 'Rituals in Rhodelen', 3),
  testSet('Ashavir', 'The Overlord of Ashavir', 4),
  testSet('Kesqer', 'Kesqerian Nights', 5),
  testSet('Godtower', 'The Godtower', 6),
  testSet('Davarron', 'Descent Under Davarron', 7),
  testSet('Havenholm', 'Throne of Havenholm', 8),
  testSet('Ulagal', 'Ballad of Ulagal', 9),
  testSet('Nordhallr', 'Ragnarök: Nordhallr', 10, { aliases: ['ragnarok', 'ragnarök'] }),
  testSet('Gurgitea', 'The Lost City of Gurgitea', 11),
  testSet('Pandemonium', 'Pandemonium', 12, { packLayout: 'pandemonium' }),
]

/** `TEST_SETS` with a stored cardback and Cardmaker for each set (`testPictureUrl` gives their addresses). */
export const TEST_SETS_WITH_PICTURES: readonly CardSet[] = TEST_SETS.map((set) => ({
  ...set,
  cardback: testPicturePath('set', set.id),
  mascot: `sets/${set.id}/abcdef0123.webp`,
}))

/** One of `TEST_SETS` by its code. */
export function testSetByCode(code: string, sets: readonly CardSet[] = TEST_SETS): CardSet {
  const set = sets.find((candidate) => candidate.code === code)
  if (!set) throw new Error(`No test set ${code}`)
  return set
}

/** The index of the 12 test sets: `useSetIndex()` with `TEST_SETS` stored. */
export const testSetIndex = setIndex(TEST_SETS)

/** How the 12 test sets name a set code: `useSetIndex().setName` with `TEST_SETS` stored. */
export const testSetName = testSetIndex.setName

/** A set change record for tests: the DM renaming Ulagal at `millis`, unless overridden. */
export function testSetChange(millis: number, overrides: Partial<SetChange> = {}): SetChange {
  return {
    id: `sc-${millis}`,
    by: 'dana',
    at: Timestamp.fromMillis(millis),
    step: 'edited',
    setId: 'ulagal',
    code: 'Ulagal',
    name: 'Ballad of Ulagal',
    fields: ['name'],
    direction: null,
    added: [],
    pictured: [],
    ...overrides,
  }
}

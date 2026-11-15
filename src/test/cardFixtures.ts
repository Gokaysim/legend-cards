import { type Card, startingFlagsOf } from '@/features/cards/schema'

/**
 * The four "where" flags off: a card only the DM gives ("Sadece DM verebilir"), hidden from players' lists. What a
 * DM-only card was before the behavior flags.
 */
export const ONLY_FROM_DM = {
  isInLibrary: false,
  isInDraws: false,
  isInSetPacks: false,
  isInMechanicPacks: false,
} as const

/** A test key from a name: lowercase letters and digits only, like the import's `nameKey`. */
const keyOf = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')

/** A normal card for tests: a Common Kesqer card in Arcanus Divine unless overridden. */
export function testCard(
  name: string,
  overrides: Partial<Omit<Extract<Card, { kind: 'normal' }>, 'kind'>> = {},
): Card {
  return {
    id: `legend-${keyOf(name)}`,
    kind: 'normal',
    name,
    nameKey: keyOf(name),
    setCode: 'Kesqer',
    cost: '1',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: `${name} text.`,
    status: 'active',
    changeId: null,
    picture: null,
    ...startingFlagsOf('normal', overrides.text ?? ''),
    holder: null,
    ...overrides,
  }
}

/** A Blessed card for tests: no set, no rarity, no cost. */
export function testBlessedCard(
  name: string,
  overrides: Partial<Omit<Extract<Card, { kind: 'blessed' }>, 'kind'>> = {},
): Card {
  return {
    id: `legend-${keyOf(name)}`,
    kind: 'blessed',
    name,
    nameKey: keyOf(name),
    setCode: null,
    cost: null,
    rarity: null,
    mechanicPack: 'Risk & Reward',
    text: `${name} text.`,
    status: 'active',
    changeId: null,
    picture: null,
    ...startingFlagsOf('blessed', overrides.text ?? ''),
    holder: null,
    ...overrides,
  }
}

/** A Cursed card for tests. */
export function testCursedCard(
  name: string,
  overrides: Partial<Omit<Extract<Card, { kind: 'cursed' }>, 'kind'>> = {},
): Card {
  return {
    id: `cursed-${keyOf(name)}`,
    kind: 'cursed',
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
    ...startingFlagsOf('cursed', overrides.text ?? ''),
    holder: null,
    ...overrides,
  }
}

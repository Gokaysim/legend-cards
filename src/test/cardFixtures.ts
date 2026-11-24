import {
  type Card,
  type CustomCard,
  type CustomCardEffect,
  startingFlagsOf,
} from '@/features/cards/schema'
import { cardCost, customCardName, hasHeld } from '@/features/custom-draft/draftRules'

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

/** A Custom Card effect for tests, with an invented text. */
export function testEffect(
  type: CustomCardEffect['type'],
  cost: CustomCardEffect['cost'] = 3,
): CustomCardEffect {
  return { type, cost, text: `Invented ${type} effect at ${cost}-cost.` }
}

/**
 * A Custom Card for tests: a 3-cost card with Caster, Draw and Gold held by Ayla, unless overridden. Its cost and its
 * Held flags follow its effects, as a finished draft writes them.
 */
export function testCustomCard(
  id: string,
  overrides: Partial<Omit<CustomCard, 'kind' | 'id'>> = {},
): CustomCard {
  const base = overrides.base ?? 3
  const effects = overrides.effects ?? [
    testEffect('Caster'),
    testEffect('Draw'),
    testEffect('Gold'),
  ]
  const held = hasHeld(effects)
  const name = customCardName(base)
  return {
    id,
    kind: 'custom',
    name,
    nameKey: keyOf(name),
    setCode: null,
    cost: `${cardCost(base, effects).total}`,
    rarity: null,
    mechanicPack: null,
    text: '',
    status: 'active',
    changeId: null,
    picture: null,
    ...startingFlagsOf('custom', ''),
    hasHeldEffect: held,
    isKeptOnUse: held,
    holder: { uid: 'ayla', userCardId: `${id}-holding` },
    base,
    draftId: 'draft-1',
    effects,
    ...overrides,
  }
}

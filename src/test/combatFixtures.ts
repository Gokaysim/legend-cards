import { Timestamp } from 'firebase/firestore'

import type { Character } from '@/features/characters/schema'
import {
  type Combat,
  type Combatant,
  type DmCombatant,
  IDLE_COMBAT,
} from '@/features/combat/schema'

/** The combat ID of the test combats. */
export const TEST_COMBAT_ID = 'combat-1'

/** A combat waiting for rolls, unless overridden. */
export function testCombat(overrides: Partial<Combat> = {}): Combat {
  return {
    ...IDLE_COMBAT,
    phase: 'gathering',
    combatId: TEST_COMBAT_ID,
    askedAt: Timestamp.fromMillis(1000),
    ...overrides,
  }
}

/** A running combat in `order`, at round 1's first place, unless overridden. */
export function testRunningCombat(
  order: readonly string[],
  overrides: Partial<Combat> = {},
): Combat {
  return testCombat({
    phase: 'running',
    order: [...order],
    turn: 0,
    round: 1,
    turnAt: Timestamp.fromMillis(2000),
    changeId: 'start-1',
    ...overrides,
  })
}

/**
 * A character's combatant: `c-<character id>`, without a roll unless `die` is given (with `modifier`, default 0).
 */
export function testCharacterCombatant(
  character: Pick<Character, 'id' | 'uid'>,
  seq: number,
  {
    die,
    modifier = 0,
    ...overrides
  }: Partial<Combatant> & { die?: number; modifier?: number } = {},
): Combatant {
  return {
    id: `c-${character.id}`,
    combatId: TEST_COMBAT_ID,
    kind: 'character',
    characterId: character.id,
    uid: character.uid,
    name: null,
    seq,
    manual: false,
    rolled: die !== undefined,
    roll: die === undefined ? null : { rollId: `r-${character.id}`, die, modifier },
    ...overrides,
  }
}

/** A typed NPC's combatant `c-<name>`, owned by `dmUid`, rolled unless overridden. */
export function testNpcCombatant(
  name: string,
  seq: number,
  dmUid: string,
  overrides: Partial<Combatant> = {},
): Combatant {
  return {
    id: `c-${name.replace(/\s+/g, '-')}`,
    combatId: TEST_COMBAT_ID,
    kind: 'npc',
    characterId: null,
    uid: dmUid,
    name,
    seq,
    manual: false,
    rolled: true,
    roll: null,
    ...overrides,
  }
}

/** An NPC's DM record. */
export function testDmCombatant(
  combatant: Pick<Combatant, 'id'>,
  die: number,
  modifier = 0,
): DmCombatant {
  return { id: combatant.id, combatId: TEST_COMBAT_ID, rollId: 'r-npc', die, modifier }
}

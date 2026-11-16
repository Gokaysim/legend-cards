import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import {
  combatantSchema,
  combatChangeSchema,
  combatSchema,
  dmCombatantSchema,
  IDLE_COMBAT,
} from './schema'

const running = {
  phase: 'running',
  combatId: 'c1',
  order: ['a', 'b'],
  turn: 1,
  round: 2,
  askedAt: Timestamp.fromMillis(1),
  turnAt: Timestamp.fromMillis(2),
  changeId: 'ch1',
}

const thorn = {
  combatId: 'c1',
  kind: 'character',
  characterId: 'thorn',
  uid: 'ayla',
  name: null,
  seq: 0,
  manual: false,
  rolled: true,
  roll: { rollId: 'r1', die: 17, modifier: 3 },
}

const goblin = {
  combatId: 'c1',
  kind: 'npc',
  characterId: null,
  uid: 'dana',
  name: 'Goblin 12',
  seq: 1,
  manual: false,
  rolled: true,
  roll: null,
}

describe('combatSchema', () => {
  it('reads a running combat and the idle combat', () => {
    expect(combatSchema.parse(running)).toEqual(running)
    expect(combatSchema.parse(IDLE_COMBAT)).toEqual(IDLE_COMBAT)
  })

  it.each([
    ['an unknown phase', { phase: 'paused' }],
    ['a negative turn', { turn: -1 }],
    ['a broken round', { round: 1.5 }],
    ['51 combatants', { order: Array.from({ length: 51 }, (_, i) => `c${String(i)}`) }],
    ['a time that is not a timestamp', { turnAt: 5 }],
  ])('rejects %s', (_case, change) => {
    expect(combatSchema.safeParse({ ...running, ...change }).success).toBe(false)
  })
})

describe('combatantSchema', () => {
  it('reads a character and an NPC', () => {
    expect(combatantSchema.parse(thorn)).toEqual(thorn)
    expect(combatantSchema.parse(goblin)).toEqual(goblin)
  })

  it('reads a character without a roll', () => {
    expect(combatantSchema.safeParse({ ...thorn, rolled: false, roll: null }).success).toBe(true)
  })

  it.each([
    ['a character with a name', { ...thorn, name: 'Thorn' }],
    ['a character without its ID', { ...thorn, characterId: null }],
    ['an NPC without a name', { ...goblin, name: null }],
    ['an NPC with a public roll', { ...goblin, roll: { rollId: 'r1', die: 3, modifier: 1 } }],
    ['a die of 21', { ...thorn, roll: { rollId: 'r1', die: 21, modifier: 0 } }],
    ['a modifier of 31', { ...thorn, roll: { rollId: 'r1', die: 2, modifier: 31 } }],
    ['a name of 45 characters', { ...goblin, name: 'x'.repeat(45) }],
  ])('rejects %s', (_case, data) => {
    expect(combatantSchema.safeParse(data).success).toBe(false)
  })
})

describe('dmCombatantSchema', () => {
  it('reads an NPC roll', () => {
    const roll = { combatId: 'c1', rollId: 'r2', die: 20, modifier: -1 }
    expect(dmCombatantSchema.parse(roll)).toEqual(roll)
  })

  it('rejects a die of 0', () => {
    expect(
      dmCombatantSchema.safeParse({ combatId: 'c1', rollId: 'r2', die: 0, modifier: 0 }).success,
    ).toBe(false)
  })
})

describe('combatChangeSchema', () => {
  it('reads a start and a pending end', () => {
    const start = { by: 'dana', at: Timestamp.fromMillis(1), step: 'start', count: 6 }
    expect(combatChangeSchema.parse(start)).toEqual(start)
    expect(combatChangeSchema.parse({ ...start, step: 'end', at: null }).at).toBeNull()
  })

  it('rejects an unknown step', () => {
    expect(
      combatChangeSchema.safeParse({ by: 'dana', at: null, step: 'pause', count: 1 }).success,
    ).toBe(false)
  })
})

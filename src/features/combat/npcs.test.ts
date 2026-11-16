import { describe, expect, it } from 'vitest'

import {
  formatModifier,
  groupLabel,
  isValidNpcGroup,
  npcGroupText,
  npcNames,
  parseModifier,
} from './npcs'

describe('npcNames', () => {
  it('numbers more than one NPC from 1', () => {
    expect(npcNames('Goblin', 4)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4'])
  })

  it('keeps one NPC as typed, trimmed', () => {
    expect(npcNames('  Ogre ', 1)).toEqual(['Ogre'])
  })
})

describe('groupLabel', () => {
  it('names a group by its first and its count', () => {
    expect(groupLabel(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4'])).toBe('Goblin 1–4')
    expect(groupLabel(['Ogre'])).toBe('Ogre')
  })
})

describe('isValidNpcGroup', () => {
  it.each([
    ['a name of 40 characters', { name: 'x'.repeat(40), count: 1, modifier: 0 }, true],
    ['a name of 41 characters', { name: 'x'.repeat(41), count: 1, modifier: 0 }, false],
    ['an empty name', { name: '  ', count: 1, modifier: 0 }, false],
    ['12 NPCs', { name: 'Kurt', count: 12, modifier: 0 }, true],
    ['13 NPCs', { name: 'Kurt', count: 13, modifier: 0 }, false],
    ['no NPC', { name: 'Kurt', count: 0, modifier: 0 }, false],
    ['a modifier of 31', { name: 'Kurt', count: 1, modifier: 31 }, false],
  ])('judges %s', (_case, group, valid) => {
    expect(isValidNpcGroup(group)).toBe(valid)
  })
})

describe('modifiers', () => {
  it.each([
    ['+3', 3],
    ['3', 3],
    ['-2', -2],
    ['−2', -2],
    [' +0 ', 0],
    ['30', 30],
    ['-10', -10],
    ['31', null],
    ['-11', null],
    ['2.5', null],
    ['', null],
    ['abc', null],
  ])('reads "%s" as %s', (text, value) => {
    expect(parseModifier(text)).toBe(value)
  })

  it('writes a sign on every modifier', () => {
    expect(formatModifier(3)).toBe('+3')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-2)).toBe('−2')
  })

  it('writes a group for a list', () => {
    expect(npcGroupText({ name: 'Goblin', count: 4, modifier: 1 })).toBe('Goblin ×4 · +1')
    expect(npcGroupText({ name: 'Ogre', count: 1, modifier: -1 })).toBe('Ogre · −1')
  })
})

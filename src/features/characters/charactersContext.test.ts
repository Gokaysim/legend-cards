import { describe, expect, it } from 'vitest'

import { testCharacter } from '@/test/characterFixtures'
import { testProfile } from '@/test/fixtures'

import { characterGroups, charactersOf, sortCharacters } from './charactersContext'

const AYLA = testProfile({ id: 'ayla', displayName: 'Ayla' })
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const CEREN = testProfile({ id: 'ceren', displayName: 'Ceren' })
const DANA = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })
/** The "Oyuncular" order: by name. */
const PROFILES = [AYLA, BORA, CEREN, DANA]

const thorin = testCharacter('Thorin', 'ayla', { addedAtMillis: 2000 })
const kuzgun = testCharacter('Kuzgun', 'ayla', { addedAtMillis: 3000 })
const old = testCharacter('Old', 'ayla', { addedAtMillis: 1000, archived: true })
const elara = testCharacter('Elara', 'bora', { addedAtMillis: 1500 })
const goblin = testCharacter('Goblin', 'dana', { addedAtMillis: 4000 })
const ghost = testCharacter('Ghost', 'nobody')
const ALL = [kuzgun, goblin, old, elara, thorin, ghost]

describe('sortCharacters', () => {
  it('orders by the time added, a pending time last, then by ID', () => {
    const pending = testCharacter('Pending', 'ayla', { createdAt: null })
    const twin = testCharacter('Twin', 'ayla', { addedAtMillis: 2000 })
    expect(sortCharacters([pending, kuzgun, twin, thorin]).map((c) => c.name)).toEqual([
      'Thorin',
      'Twin',
      'Kuzgun',
      'Pending',
    ])
  })
})

describe('charactersOf', () => {
  it("lists one user's active characters in the order added", () => {
    expect(charactersOf(ALL, 'ayla').map((c) => c.name)).toEqual(['Thorin', 'Kuzgun'])
  })

  it("lists one user's archived characters", () => {
    expect(charactersOf(ALL, 'ayla', { archived: true }).map((c) => c.name)).toEqual(['Old'])
  })

  it('lists nothing for a user without characters', () => {
    expect(charactersOf(ALL, 'ceren')).toEqual([])
  })
})

describe('characterGroups', () => {
  const summary = (holder: string) =>
    characterGroups(ALL, PROFILES, holder).map((group) => [
      group.name,
      group.characters.map((c) => c.name),
    ])

  it("puts the holder's group first, then the others in the list's order", () => {
    expect(summary('bora')).toEqual([
      ['Bora', ['Elara']],
      ['Ayla', ['Thorin', 'Kuzgun']],
      ['Dana', ['Goblin']],
    ])
  })

  it('leaves out users without active characters, archived characters and unknown owners', () => {
    expect(summary('ceren')).toEqual([
      ['Ayla', ['Thorin', 'Kuzgun']],
      ['Bora', ['Elara']],
      ['Dana', ['Goblin']],
    ])
  })
})

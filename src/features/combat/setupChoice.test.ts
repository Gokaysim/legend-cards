import { describe, expect, it } from 'vitest'

import { testCharacter } from '@/test/characterFixtures'
import { ready, testProfile } from '@/test/fixtures'

import { initialCombatChoice, isOfflineOwner } from './setupChoice'

const AYLA = testProfile({ id: 'ayla', displayName: 'Ayla' })
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const DM = testProfile({ id: 'dm', displayName: 'Dana', role: 'dm' })
const PROFILES = [AYLA, BORA, DM]

const THORN = testCharacter('Thorn', 'ayla')
const KUZGUN = testCharacter('Kuzgun', 'ayla')
const OLD = { ...testCharacter('Eski', 'ayla'), archived: true }
const ELARA = testCharacter('Elara', 'bora')
const SEF = testCharacter('Goblin şefi', 'dm')
const CHARACTERS = [THORN, KUZGUN, OLD, ELARA, SEF]

const online = (...uids: string[]) => ready<ReadonlySet<string>>(new Set(uids))
const chosen = (set: ReadonlySet<string>) =>
  CHARACTERS.filter((c) => set.has(c.id)).map((c) => c.name)

// Spec: initiative-tracker, "Setting up a combat" (show-online-players).
describe('initialCombatChoice', () => {
  it('checks the unarchived characters of online players, and not the DM’s own', () => {
    expect(chosen(initialCombatChoice(CHARACTERS, PROFILES, online('ayla', 'bora', 'dm')))).toEqual(
      ['Thorn', 'Kuzgun', 'Elara'],
    )
  })

  it('leaves an offline player’s characters unchecked', () => {
    expect(chosen(initialCombatChoice(CHARACTERS, PROFILES, online('ayla', 'dm')))).toEqual([
      'Thorn',
      'Kuzgun',
    ])
  })

  it.each([
    ['loading', { status: 'loading' } as const],
    [
      'failed',
      { status: 'error', error: { kind: 'unknown', message: 'x', path: 'presence' } } as const,
    ],
  ])('checks every player’s characters while presence is %s', (_case, presence) => {
    expect(chosen(initialCombatChoice(CHARACTERS, PROFILES, presence))).toEqual([
      'Thorn',
      'Kuzgun',
      'Elara',
    ])
  })
})

describe('isOfflineOwner', () => {
  it('marks an owner who is not online, only once presence is ready', () => {
    expect(isOfflineOwner('bora', online('ayla'))).toBe(true)
    expect(isOfflineOwner('ayla', online('ayla'))).toBe(false)
    expect(isOfflineOwner('bora', { status: 'loading' })).toBe(false)
  })
})

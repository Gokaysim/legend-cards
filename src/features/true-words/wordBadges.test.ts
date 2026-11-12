import { describe, expect, it } from 'vitest'

import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

import { wordBadges } from './wordBadges'

const aid = testTrueWord('Aid')

describe('wordBadges', () => {
  it('marks an active word "Aktif"', () => {
    expect(wordBadges({ record: testLearnedWord('r1', aid, 'ayla', { active: true }) })).toEqual([
      { label: 'Aktif', tone: 'active' },
    ])
  })

  it('gives an inactive word no badge', () => {
    expect(wordBadges({ record: testLearnedWord('r1', aid, 'ayla') })).toEqual([])
  })
})

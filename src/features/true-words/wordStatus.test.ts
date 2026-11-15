import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testProfile } from '@/test/fixtures'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

import { wordStatuses } from './wordStatus'

const profiles = [
  testProfile({ id: 'ayla', displayName: 'Ayla' }),
  testProfile({ id: 'bora', displayName: 'Bora' }),
]
const abyss = testTrueWord('Abyss')
const bind = testTrueWord('Bind')

describe('wordStatuses', () => {
  it('names the players who know each word, in the order they learned it, and never puts a word in a pool', () => {
    const statuses = wordStatuses(
      [abyss, bind],
      [
        testLearnedWord('r2', abyss, 'bora', { learnedAt: Timestamp.fromMillis(2000) }),
        testLearnedWord('r1', abyss, 'ayla', { learnedAt: Timestamp.fromMillis(1000) }),
      ],
      profiles,
    )

    expect(statuses.get(abyss.id)).toEqual({ inPool: false, holderNames: ['Ayla', 'Bora'] })
    expect(statuses.get(bind.id)).toEqual({ inPool: false, holderNames: [] })
  })

  it('leaves out a word taken back, and names a player without a profile generically', () => {
    const statuses = wordStatuses(
      [abyss],
      [
        testLearnedWord('r1', abyss, 'ayla', { removedBy: 'dana' }),
        testLearnedWord('r2', abyss, 'cem'),
      ],
      profiles,
    )

    expect(statuses.get(abyss.id)?.holderNames).toEqual(['İsimsiz oyuncu'])
  })
})

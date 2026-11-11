import { describe, expect, it } from 'vitest'

import { testTrueWord } from '@/test/trueWordFixtures'

import { learnableWords } from './api'

describe('learnableWords', () => {
  it('offers only the active words the player does not know', () => {
    const abyss = testTrueWord('Abyss')
    const aid = testTrueWord('Aid')
    const old = testTrueWord('Old', { status: 'retired' })
    const echo = testTrueWord('Echo', { status: 'draft', cost: null, text: '' })

    expect(learnableWords([abyss, aid, old, echo], new Set([aid.id]))).toEqual([abyss])
  })
})

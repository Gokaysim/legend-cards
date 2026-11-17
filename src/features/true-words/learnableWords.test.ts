import { describe, expect, it } from 'vitest'

import { testTrueWord } from '@/test/trueWordFixtures'

import { learnableWords, teachableWords } from './api'

const abyss = testTrueWord('Abyss')
const aid = testTrueWord('Aid')
const old = testTrueWord('Old', { status: 'retired' })
const echo = testTrueWord('Echo', { status: 'draft', cost: null, text: '' })
const justice = testTrueWord('Justice', { isInDraws: false, isInLibrary: false })

describe('learnableWords', () => {
  it('offers only the active words the player does not know', () => {
    expect(learnableWords([abyss, aid, old, echo], new Set([aid.id]))).toEqual([abyss])
  })

  it('leaves out a word kept out of drafts', () => {
    expect(learnableWords([abyss, justice], new Set())).toEqual([abyss])
  })
})

describe('teachableWords', () => {
  it('offers every active word the player does not know, whatever its flags', () => {
    expect(teachableWords([abyss, aid, old, echo, justice], new Set([aid.id]))).toEqual([
      abyss,
      justice,
    ])
  })

  it('leaves out a word kept out of drafts once the player knows it', () => {
    expect(teachableWords([justice], new Set([justice.id]))).toEqual([])
  })
})

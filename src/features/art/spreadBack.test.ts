import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'

import { artLookup } from './artContext'
import { BLESSED_BACK, cardBack, CURSED_BACK, NEUTRAL_BACK, spreadBackUrl } from './spreadBack'

const ART = artLookup(
  testArt({
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      cursed: '/art/backs/cursed.0123456789.webp',
      blessed: '/art/backs/blessed.0123456789.webp',
    },
    packs: { 'mechanic:Blood & Battle': '/art/packs/mechanic-blood-battle.0123456789.webp' },
  }),
)

describe('spreadBackUrl', () => {
  it('draws the neutral back without a picture', () => {
    expect(spreadBackUrl(ART, NEUTRAL_BACK)).toBeNull()
  })

  it('gives the Cursed cardback and a set cardback their pictures', () => {
    expect(spreadBackUrl(ART, CURSED_BACK)).toBe('/art/backs/cursed.0123456789.webp')
    expect(spreadBackUrl(ART, { kind: 'set', setCode: 'Kesqer' })).toBe(
      '/art/backs/kesqer.0123456789.webp',
    )
  })

  it("gives a Mechanic Pack's back its pack picture, or none without one", () => {
    expect(spreadBackUrl(ART, { kind: 'pack', packKey: 'mechanic:Blood & Battle' })).toBe(
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(spreadBackUrl(ART, { kind: 'pack', packKey: 'mechanic:Permamancy' })).toBeNull()
  })
})

describe('cardBack', () => {
  it('gives a Blessed card the Blessed cardback, with its picture', () => {
    expect(cardBack({ kind: 'blessed', setCode: null })).toEqual(BLESSED_BACK)
    expect(spreadBackUrl(ART, BLESSED_BACK)).toBe('/art/backs/blessed.0123456789.webp')
  })

  it('gives a Cursed card the Cursed cardback', () => {
    expect(cardBack({ kind: 'cursed', setCode: null })).toEqual(CURSED_BACK)
  })

  it("gives a set card its set's cardback, which is the neutral back without a picture", () => {
    expect(cardBack({ kind: 'normal', setCode: 'Kesqer' })).toEqual({
      kind: 'set',
      setCode: 'Kesqer',
    })
    expect(spreadBackUrl(ART, cardBack({ kind: 'normal', setCode: 'Kesqer' }))).toBe(
      '/art/backs/kesqer.0123456789.webp',
    )
    expect(spreadBackUrl(ART, cardBack({ kind: 'normal', setCode: 'Pandemonium' }))).toBeNull()
  })

  it('gives a card without a set the neutral back', () => {
    expect(cardBack({ kind: 'normal', setCode: null })).toEqual(NEUTRAL_BACK)
  })

  it('draws the Blessed back without a picture when none is built', () => {
    expect(spreadBackUrl(artLookup(testArt({})), BLESSED_BACK)).toBeNull()
  })
})

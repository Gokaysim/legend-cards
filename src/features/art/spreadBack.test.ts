import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'

import { artLookup } from './artContext'
import { CURSED_BACK, NEUTRAL_BACK, spreadBackUrl } from './spreadBack'

const ART = artLookup(
  testArt({
    cardbacks: {
      Kesqer: '/art/backs/kesqer.0123456789.webp',
      cursed: '/art/backs/cursed.0123456789.webp',
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

import { describe, expect, it } from 'vitest'

import { GOLDEN_LINE, packLine } from './packLines'

const mechanic = (mechanicPack: string) => ({ type: 'mechanic' as const, mechanicPack })

describe('packLine', () => {
  it("gives a Mechanic Pack's description and the Cardmaker's line", () => {
    const line = packLine(mechanic('Blood & Battle'))

    expect(line?.summary).toBe(
      'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
    )
    expect(line?.speech).toMatch(/^Aman dikkat et kendine evladım\./)
  })

  it('finds Risk & Reward by either spelling', () => {
    expect(packLine(mechanic('Risk & Reward'))).not.toBeNull()
    expect(packLine(mechanic('Risk and Reward'))).toBe(packLine(mechanic('Risk & Reward')))
  })

  it("gives the Golden Pack its line, with v2.2.8's typo fixed", () => {
    expect(packLine({ type: 'golden', mechanicPack: null })).toBe(GOLDEN_LINE)
    expect(GOLDEN_LINE.summary).toBe('Sadece Rare kartlar ve Blessed kartlar içerir.')
  })

  it('gives no line to the other packs, or to a mechanic pack without words', () => {
    expect(packLine({ type: 'standard', mechanicPack: null })).toBeNull()
    expect(packLine({ type: 'cursedGolden', mechanicPack: null })).toBeNull()
    expect(packLine(mechanic('Brand New Mechanic'))).toBeNull()
    expect(packLine({ type: 'mechanic', mechanicPack: null })).toBeNull()
  })
})

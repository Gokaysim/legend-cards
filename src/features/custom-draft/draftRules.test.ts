import { describe, expect, it } from 'vitest'

import { cryptoRandom } from '@/lib/random'

import {
  applyPick,
  availableTypes,
  cardCost,
  composeText,
  costLine,
  type CustomCost,
  customCardName,
  EFFECT_TYPES,
  type EffectType,
  type EffectVariants,
  hasHeld,
  isDraftComplete,
  isFullyResolved,
  missingTexts,
  nextOptions,
  requiredPicks,
  resolveEffects,
  startProgress,
  stepCost,
  variantCount,
  variantText,
} from './draftRules'

/** Every type with a text at every cost. */
const FULL: EffectVariants = Object.fromEntries(
  EFFECT_TYPES.map((type) => [
    type,
    { '1': `${type} one`, '3': `${type} three`, '5': `${type} five` },
  ]),
)

/** A source that always returns 0: `sample` then keeps the list's order. */
const first = () => 0

const pickAll = (base: CustomCost, types: EffectType[]) =>
  types.reduce((progress, type) => applyPick(progress, type), startProgress(base))

describe('variants', () => {
  it('reads a text and treats a missing or empty one as none', () => {
    const variants: EffectVariants = { Draw: { '1': 'draw', '5': '' } }
    expect(variantText(variants, 'Draw', 1)).toBe('draw')
    expect(variantText(variants, 'Draw', 3)).toBeNull()
    expect(variantText(variants, 'Draw', 5)).toBeNull()
    expect(variantText(variants, 'Gold', 1)).toBeNull()
    expect(variantCount(variants, 1)).toBe(1)
    expect(variantCount(variants, 5)).toBe(0)
  })
})

describe('the cost of a step', () => {
  it('uses the draft cost by default', () => {
    expect(stepCost(3, 0, 0)).toBe(3)
    expect(stepCost(5, 4, 0)).toBe(5)
  })

  it('uses 1-cost from the fourth pick while extra picks remain', () => {
    expect(stepCost(3, 2, 2)).toBe(3)
    expect(stepCost(3, 3, 2)).toBe(1)
    expect(stepCost(3, 4, 1)).toBe(1)
  })

  it('gives the fourth and fifth steps 1-cost after a 3-cost Special among the first three', () => {
    let progress = pickAll(3, ['Special', 'Caster'])
    expect(progress.offerCost).toBe(3)
    progress = applyPick(progress, 'Draw')
    expect(progress.offerCost).toBe(1)
    progress = applyPick(progress, 'Gold')
    expect(progress.picks[3]).toEqual({ type: 'Gold', cost: 1 })
    expect(progress.offerCost).toBe(1)
    progress = applyPick(progress, 'Roll')
    expect(progress.picks[4]).toEqual({ type: 'Roll', cost: 1 })
    expect(isDraftComplete(progress)).toBe(true)
  })

  it('goes on with two 1-cost steps after a 3-cost Special as the third pick', () => {
    const progress = pickAll(3, ['Caster', 'Draw', 'Special'])
    expect(progress).toMatchObject({ required: 5, bonusLeft: 2, offerCost: 1 })
    expect(isDraftComplete(progress)).toBe(false)
  })
})

describe('number of picks', () => {
  it('finishes a plain card after 3 picks', () => {
    const progress = pickAll(1, ['Caster', 'Draw', 'Gold'])
    expect(progress.required).toBe(3)
    expect(isDraftComplete(progress)).toBe(true)
    expect(requiredPicks(progress.picks)).toBe(3)
  })

  it('needs 6 picks with Effects at 5-cost', () => {
    const progress = pickAll(5, ['Effects'])
    expect(progress.required).toBe(6)
    expect(requiredPicks(progress.picks)).toBe(6)
  })

  it('needs 5 picks with Effects at 3-cost or 1-cost', () => {
    expect(pickAll(3, ['Effects']).required).toBe(5)
    expect(pickAll(1, ['Effects']).required).toBe(5)
  })

  it('needs 7 picks for Effects and a 3-cost Special, two of them at 1-cost', () => {
    const types: EffectType[] = ['Effects', 'Special', 'Caster', 'Draw', 'Gold', 'Roll', 'XP']
    let progress = startProgress(3)
    for (const [index, type] of types.entries()) {
      expect(isDraftComplete(progress)).toBe(false)
      progress = applyPick(progress, type)
      expect(progress.required).toBe(index === 0 ? 5 : 7)
    }
    expect(isDraftComplete(progress)).toBe(true)
    expect(progress.picks.map((pick) => pick.cost)).toEqual([3, 3, 3, 1, 1, 3, 3])
    expect(requiredPicks(progress.picks)).toBe(7)
  })

  it('adds 2 for Effects picked in a 1-cost step of a 3-cost draft', () => {
    let progress = pickAll(3, ['Special', 'Caster', 'Draw'])
    expect(progress).toMatchObject({ required: 5, offerCost: 1 })
    progress = applyPick(progress, 'Effects')
    expect(progress.picks[3]).toEqual({ type: 'Effects', cost: 1 })
    expect(progress.required).toBe(7)
  })

  it('gives the header numbers: 3 / 5 with 2 extra 1-cost picks', () => {
    const progress = pickAll(3, ['Special', 'Caster', 'Draw'])
    expect([progress.picks.length, progress.required, progress.bonusLeft]).toEqual([3, 5, 2])
  })
})

describe('options', () => {
  it('offers up to 3 types not picked yet that have a text at the step cost', () => {
    const variants: EffectVariants = {
      Caster: { '3': 'c' },
      Draw: { '3': 'd' },
      Gold: { '3': 'g' },
      Roll: { '3': 'r', '1': 'r1' },
      XP: { '1': 'x' },
    }
    const progress = pickAll(3, ['Draw'])
    expect(availableTypes(variants, progress.picks, 3)).toEqual(['Caster', 'Gold', 'Roll'])
    expect(nextOptions(variants, progress, first)).toHaveLength(3)
    expect(nextOptions(variants, progress, first)).not.toContain('Draw')
  })

  it('offers each available type with the same chance', () => {
    const counts = new Map<string, number>()
    for (let round = 0; round < 2000; round += 1) {
      for (const type of nextOptions(FULL, startProgress(1), cryptoRandom)) {
        counts.set(type, (counts.get(type) ?? 0) + 1)
      }
    }
    expect(counts.size).toBe(18)
    for (const count of counts.values()) expect(count).toBeGreaterThan(200)
  })

  it('offers nothing when no unpicked type has a text at the cost', () => {
    const variants: EffectVariants = {
      Caster: { '5': 'c' },
      Draw: { '5': 'd' },
      Gold: { '5': 'g' },
      Effects: { '5': 'e' },
    }
    const progress = pickAll(5, ['Effects', 'Caster', 'Draw', 'Gold'])
    expect(isDraftComplete(progress)).toBe(false)
    expect(nextOptions(variants, progress, first)).toEqual([])
  })

  it('offers nothing once the draft is complete', () => {
    expect(nextOptions(FULL, pickAll(1, ['Caster', 'Draw', 'Gold']), first)).toEqual([])
  })
})

describe('resolving the effects', () => {
  it('lowers the others to 1-cost after a 5-cost Special', () => {
    const progress = pickAll(5, ['Special', 'Caster', 'Gold'])
    expect(resolveEffects(5, progress.picks, FULL, first)).toEqual([
      { type: 'Special', cost: 5, text: 'Special five' },
      { type: 'Caster', cost: 1, text: 'Caster one' },
      { type: 'Gold', cost: 1, text: 'Gold one' },
    ])
  })

  it('raises exactly one random other effect to 3-cost after a 1-cost Special', () => {
    const progress = pickAll(1, ['Special', 'Caster', 'Gold'])
    for (const [random, raised] of [
      [() => 0, 'Caster'],
      [() => 1, 'Gold'],
    ] as const) {
      const resolved = resolveEffects(1, progress.picks, FULL, random)
      expect(resolved.find((pick) => pick.type === 'Special')?.cost).toBe(1)
      expect(resolved.filter((pick) => pick.cost === 3).map((pick) => pick.type)).toEqual([raised])
    }
  })

  it('raises only an effect that has a 3-cost text', () => {
    const variants: EffectVariants = { ...FULL, Caster: { '1': 'c1' } }
    const progress = pickAll(1, ['Special', 'Caster', 'Gold'])
    const resolved = resolveEffects(1, progress.picks, variants, () => 0)
    expect(resolved.find((pick) => pick.cost === 3)?.type).toBe('Gold')
  })

  it('raises nothing for a 1-cost Special in a 3-cost draft', () => {
    const progress = pickAll(3, ['Caster', 'Gold', 'Draw'])
    const withSpecial = {
      ...progress,
      picks: [...progress.picks, { type: 'Special' as const, cost: 1 as const }],
    }
    const resolved = resolveEffects(3, withSpecial.picks, FULL, first)
    expect(resolved.map((pick) => pick.cost)).toEqual([3, 3, 3, 1])
    expect(pickAll(3, ['Caster', 'Gold', 'Special']).picks.at(-1)).toEqual({
      type: 'Special',
      cost: 3,
    })
  })

  it('names the effects whose resolved text is missing', () => {
    const variants: EffectVariants = { ...FULL, Gold: { '5': 'g5' } }
    const resolved = resolveEffects(
      5,
      pickAll(5, ['Special', 'Caster', 'Gold']).picks,
      variants,
      first,
    )
    expect(missingTexts(resolved)).toEqual(['Gold'])
    expect(isFullyResolved(resolved)).toBe(false)
  })
})

describe('the cost of a Custom Card', () => {
  it('adds Effects and takes away Cursed: 3 + 2 − 2 = 3', () => {
    const cost = cardCost(3, [
      { type: 'Effects', cost: 3 },
      { type: 'Cursed', cost: 3 },
      { type: 'Caster', cost: 3 },
    ])
    expect(cost.total).toBe(3)
    expect(costLine(cost)).toBe('3 + 2 (Effects) − 2 (Cursed) = 3')
  })

  it('never goes below 0', () => {
    expect(cardCost(1, [{ type: 'Cursed', cost: 1 }]).total).toBe(0)
    expect(cardCost(1, [{ type: 'Cursed', cost: 5 }]).total).toBe(0)
  })

  it('follows the tables at each cost', () => {
    expect(
      [1, 3, 5].map((c) => cardCost(5, [{ type: 'Effects', cost: c as CustomCost }]).total),
    ).toEqual([6, 7, 7])
    expect(
      [1, 3, 5].map((c) => cardCost(5, [{ type: 'Cursed', cost: c as CustomCost }]).total),
    ).toEqual([4, 3, 2])
  })

  it('costs 6 when a 5-cost Special lowers the Effects to 1-cost', () => {
    const resolved = resolveEffects(5, pickAll(5, ['Special', 'Effects']).picks, FULL, first)
    expect(resolved.find((pick) => pick.type === 'Effects')?.cost).toBe(1)
    expect(cardCost(5, resolved as { type: EffectType; cost: CustomCost }[]).total).toBe(6)
  })

  it('shows only the cost when nothing changes it', () => {
    expect(costLine(cardCost(3, [{ type: 'Caster', cost: 3 }]))).toBe('3')
  })
})

describe('the card', () => {
  it('is named after its draft cost', () => {
    expect(customCardName(3)).toBe('3-Cost Custom Card')
  })

  it('composes its text from its effects', () => {
    expect(
      composeText([
        { type: 'Caster', cost: 3, text: 'cast' },
        { type: 'Draw', cost: 1, text: 'draw' },
      ]),
    ).toBe('Caster (3-Cost): cast\n\nDraw (1-Cost): draw')
  })

  it('knows a Held card', () => {
    expect(hasHeld([{ type: 'Held' }])).toBe(true)
    expect(hasHeld([{ type: 'Caster' }])).toBe(false)
  })
})

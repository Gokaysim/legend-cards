import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { customEffectsSchema, EFFECT_TEXT_MAX } from './effectsSchema'

const at = Timestamp.fromMillis(0)

describe('customEffectsSchema', () => {
  it('accepts variants of known types at 1, 3 and 5-cost', () => {
    const parsed = customEffectsSchema.parse({
      variants: { Caster: { '1': 'a', '3': 'b', '5': 'c' }, Draw: { '3': 'd' } },
      importedAt: at,
    })
    expect(parsed.variants.Draw).toEqual({ '3': 'd' })
  })

  it('rejects an unknown type', () => {
    expect(
      customEffectsSchema.safeParse({ variants: { Luck: { '1': 'a' } }, importedAt: at }).success,
    ).toBe(false)
  })

  it('rejects an unknown cost', () => {
    expect(
      customEffectsSchema.safeParse({ variants: { Caster: { '2': 'a' } }, importedAt: at }).success,
    ).toBe(false)
  })

  it('rejects an empty or too long text', () => {
    for (const text of ['', 'x'.repeat(EFFECT_TEXT_MAX + 1)]) {
      expect(
        customEffectsSchema.safeParse({ variants: { Caster: { '1': text } }, importedAt: at })
          .success,
      ).toBe(false)
    }
    expect(
      customEffectsSchema.safeParse({
        variants: { Caster: { '1': 'x'.repeat(EFFECT_TEXT_MAX) } },
        importedAt: at,
      }).success,
    ).toBe(true)
  })
})

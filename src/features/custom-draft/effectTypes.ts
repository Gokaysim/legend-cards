// The custom effect vocabulary, with no imports, so that the scripts' drift test can read it
// (scripts/lib/customEffectRows.test.ts).

/** The 18 effect types, in the owner's table order. Keep in step with `firestore.rules`. */
export const EFFECT_TYPES = [
  'Blessed',
  'Caster',
  'Combat',
  'Cursed',
  'Damage',
  'Discard',
  'Draw',
  'Effects',
  'Enhance',
  'Gain',
  'Gold',
  'Held',
  'Reduce',
  'Restore',
  'Roll',
  'Special',
  'TW',
  'XP',
] as const
export type EffectType = (typeof EFFECT_TYPES)[number]

/** The costs of a draft and of an effect variant. A draft's LP price equals its cost. */
export const CUSTOM_COSTS = [1, 3, 5] as const
export type CustomCost = (typeof CUSTOM_COSTS)[number]

/** The longest effect text. Keep in step with `scripts/lib/customEffectRows.ts`. */
export const EFFECT_TEXT_MAX = 1000

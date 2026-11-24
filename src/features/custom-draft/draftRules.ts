import { pickRandom, type RandomSource, sample } from '@/lib/random'

import { CUSTOM_COSTS, type CustomCost, EFFECT_TYPES, type EffectType } from './effectTypes'

/**
 * The Custom Card Draft's rules and a Custom Card's cost (design D5 of add-custom-card-draft): one pure module that
 * the screen, the API and the tests share. `firestore.rules` mirrors the step counters (`applyPick`); keep the two in
 * step.
 */

export { CUSTOM_COSTS, type CustomCost, EFFECT_TYPES, type EffectType } from './effectTypes'

/** How many options a step shows at most. Keep in step with `firestore.rules`. */
export const OPTIONS_PER_STEP = 3

/** How many different effects a card needs before Effects and a 3-cost Special add more. */
export const BASE_PICKS = 3

/** True for one of the 18 effect types. */
export function isEffectType(value: unknown): value is EffectType {
  return typeof value === 'string' && (EFFECT_TYPES as readonly string[]).includes(value)
}

/** True for 1, 3 or 5. */
export function isCustomCost(value: unknown): value is CustomCost {
  return typeof value === 'number' && (CUSTOM_COSTS as readonly number[]).includes(value)
}

/** The stored texts of each type's variants, keyed by the cost as a string (`customEffects/main`). */
export type EffectVariants = Partial<Record<EffectType, Partial<Record<'1' | '3' | '5', string>>>>

/** The text of a type's variant at a cost, or `null` when there is none. */
export function variantText(
  variants: EffectVariants,
  type: EffectType,
  cost: CustomCost,
): string | null {
  const text = variants[type]?.[`${cost}`]
  return text === undefined || text === '' ? null : text
}

/** How many variants are stored at a cost: a draft at that cost needs at least one. */
export function variantCount(variants: EffectVariants, cost: CustomCost): number {
  return EFFECT_TYPES.filter((type) => variantText(variants, type, cost) !== null).length
}

/** One pick of a draft: the type and the cost it was picked at. */
export type DraftPick = { type: EffectType; cost: CustomCost }

/**
 * Where a draft stands: its cost, its picks, and the counters the rules check one step at a time (design D3):
 * `required` picks in all, `bonusLeft` extra 1-cost picks still due, and the `offerCost` of the current step.
 */
export type DraftProgress = {
  base: CustomCost
  picks: readonly DraftPick[]
  required: number
  bonusLeft: number
  offerCost: CustomCost
}

/** A new draft at a cost, before its first pick. */
export function startProgress(base: CustomCost): DraftProgress {
  return { base, picks: [], required: BASE_PICKS, bonusLeft: 0, offerCost: base }
}

/**
 * The cost of the step after `size` picks (spec: custom-cards, "The cost of a step"): 1 from the fourth pick on while
 * extra picks from a 3-cost Special remain, the draft's cost otherwise.
 */
export function stepCost(base: CustomCost, size: number, bonusLeft: number): CustomCost {
  return bonusLeft > 0 && size >= BASE_PICKS ? 1 : base
}

/** The picks Effects adds when picked at a cost: 3 at 5-cost, 2 otherwise (owner decision of 2026-11-20). */
function effectsExtra(cost: CustomCost): number {
  return cost === 5 ? 3 : 2
}

/** The 1-cost picks a 3-cost Special adds. */
const SPECIAL_EXTRA = 2

/**
 * How many picks a draft with these picks needs (spec: custom-cards, "Number of picks"): 3, plus Effects' extra picks,
 * plus 2 for a 3-cost Special.
 */
export function requiredPicks(picks: readonly DraftPick[]): number {
  let required = BASE_PICKS
  for (const pick of picks) {
    if (pick.type === 'Effects') required += effectsExtra(pick.cost)
    if (pick.type === 'Special' && pick.cost === 3) required += SPECIAL_EXTRA
  }
  return required
}

/** True when the draft has all its picks, so its last pick makes the card. */
export function isDraftComplete(progress: DraftProgress): boolean {
  return progress.picks.length >= progress.required && progress.bonusLeft === 0
}

/**
 * The draft after picking `type` at the current step's cost: the transitions `firestore.rules` checks (design D3).
 * The caller makes sure the type was offered.
 */
export function applyPick(progress: DraftProgress, type: EffectType): DraftProgress {
  const cost = progress.offerCost
  const bonusStep = progress.bonusLeft > 0 && progress.picks.length >= BASE_PICKS
  const specialExtra = type === 'Special' && cost === 3 ? SPECIAL_EXTRA : 0
  const picks = [...progress.picks, { type, cost }]
  const bonusLeft = progress.bonusLeft - (bonusStep ? 1 : 0) + specialExtra
  const required = progress.required + (type === 'Effects' ? effectsExtra(cost) : 0) + specialExtra
  return {
    base: progress.base,
    picks,
    required,
    bonusLeft,
    offerCost: stepCost(progress.base, picks.length, bonusLeft),
  }
}

/** The types a step at `cost` can offer: not picked yet, and with a text at that cost. */
export function availableTypes(
  variants: EffectVariants,
  picks: readonly DraftPick[],
  cost: CustomCost,
): EffectType[] {
  const picked = new Set(picks.map((pick) => pick.type))
  return EFFECT_TYPES.filter(
    (type) => !picked.has(type) && variantText(variants, type, cost) !== null,
  )
}

/**
 * The options of the current step (spec: custom-cards, "Draft options"): up to 3 of the available types, each with the
 * same chance, in random order. Empty when none is left ("Too few options"), or when the draft is complete.
 */
export function nextOptions(
  variants: EffectVariants,
  progress: DraftProgress,
  random: RandomSource,
): EffectType[] {
  if (isDraftComplete(progress)) return []
  return sample(
    availableTypes(variants, progress.picks, progress.offerCost),
    OPTIONS_PER_STEP,
    random,
  )
}

/** One effect of a finished Custom Card: its type, its resolved cost, and that variant's text. */
export type CustomEffect = { type: EffectType; cost: CustomCost; text: string }

/** A resolved pick whose text may be missing: then the card is not made. */
export type ResolvedPick = { type: EffectType; cost: CustomCost; text: string | null }

/**
 * The finished card's effects, in pick order (spec: custom-cards, "Resolving the effects"):
 * - in a 5-cost draft with Special picked at 5-cost, every other effect takes its 1-cost text;
 * - in a 1-cost draft with Special picked at 1-cost, one random other effect that has a 3-cost text takes it;
 * - every other effect keeps the cost it was picked at.
 */
export function resolveEffects(
  base: CustomCost,
  picks: readonly DraftPick[],
  variants: EffectVariants,
  random: RandomSource,
): ResolvedPick[] {
  const hasSpecialAt = (cost: CustomCost) =>
    picks.some((pick) => pick.type === 'Special' && pick.cost === cost)
  const lowered = base === 5 && hasSpecialAt(5)
  let raised: EffectType | null = null
  if (base === 1 && hasSpecialAt(1)) {
    const eligible = picks.filter(
      (pick) => pick.type !== 'Special' && variantText(variants, pick.type, 3) !== null,
    )
    raised = pickRandom(eligible, random)?.type ?? null
  }
  return picks.map((pick) => {
    let cost = pick.cost
    if (lowered && pick.type !== 'Special') cost = 1
    if (pick.type === raised) cost = 3
    return { type: pick.type, cost, text: variantText(variants, pick.type, cost) }
  })
}

/** The types whose resolved text is missing. */
export function missingTexts(resolved: readonly ResolvedPick[]): EffectType[] {
  return resolved.filter((pick) => pick.text === null).map((pick) => pick.type)
}

/** True when every resolved pick has a text. */
export function isFullyResolved(resolved: readonly ResolvedPick[]): resolved is CustomEffect[] {
  return missingTexts(resolved).length === 0
}

/**
 * How much an Effects and a Cursed effect change a Custom Card's cost, by the effect's cost. These come from the
 * owner's effect texts as agreed on 2026-11-20 (see `docs/domain.md`): a changed Effects or Cursed text needs a change
 * here.
 */
export const EFFECTS_INCREASE: Record<CustomCost, number> = { 1: 1, 3: 2, 5: 2 }
export const CURSED_DECREASE: Record<CustomCost, number> = { 1: 1, 3: 2, 5: 3 }

/** One change to a Custom Card's cost: `+2 (Effects)` or `−2 (Cursed)`. */
export type CostPart = { type: 'Effects' | 'Cursed'; delta: number }

/** A Custom Card's computed cost and how it was reached. */
export type CustomCardCost = { base: CustomCost; parts: CostPart[]; total: number }

/**
 * A Custom Card's cost (spec: custom-cards, "The cost of a Custom Card"): the draft's cost, plus its Effects' increase,
 * minus its Cursed's reduction, never below 0.
 */
export function cardCost(
  base: CustomCost,
  effects: readonly Pick<CustomEffect, 'type' | 'cost'>[],
): CustomCardCost {
  const parts: CostPart[] = []
  for (const effect of effects) {
    if (effect.type === 'Effects')
      parts.push({ type: 'Effects', delta: EFFECTS_INCREASE[effect.cost] })
    if (effect.type === 'Cursed')
      parts.push({ type: 'Cursed', delta: -CURSED_DECREASE[effect.cost] })
  }
  const sum = parts.reduce<number>((total, part) => total + part.delta, base)
  return { base, parts, total: Math.max(0, sum) }
}

/** The details' cost line: "3 + 2 (Effects) − 2 (Cursed) = 3", or only the cost when nothing changes it. */
export function costLine(cost: CustomCardCost): string {
  if (cost.parts.length === 0) return `${cost.total}`
  const parts = cost.parts.map(
    (part) => `${part.delta < 0 ? '−' : '+'} ${Math.abs(part.delta)} (${part.type})`,
  )
  return `${cost.base} ${parts.join(' ')} = ${cost.total}`
}

/** True when the effects include Held: the card then stays in the hand when used. */
export function hasHeld(effects: readonly Pick<CustomEffect, 'type'>[]): boolean {
  return effects.some((effect) => effect.type === 'Held')
}

/** A Custom Card's name, after its draft cost. */
export function customCardName(base: CustomCost): string {
  return `${base}-Cost Custom Card`
}

/** One effect as the card's text shows it. */
export function effectLine(effect: CustomEffect): string {
  return `${effect.type} (${effect.cost}-Cost): ${effect.text}`
}

/** A Custom Card's text, composed from its effects: one paragraph per effect. */
export function composeText(effects: readonly CustomEffect[]): string {
  return effects.map(effectLine).join('\n\n')
}

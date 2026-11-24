import { Timestamp } from 'firebase/firestore'

import { EFFECT_TYPES, type EffectVariants } from '@/features/custom-draft/draftRules'
import type { CustomDraft } from '@/features/custom-draft/schema'

/** Every custom effect type at every cost, with invented texts: "Caster at 3.". */
export const TEST_VARIANTS: EffectVariants = Object.fromEntries(
  EFFECT_TYPES.map((type) => [
    type,
    { '1': `${type} at 1.`, '3': `${type} at 3.`, '5': `${type} at 5.` },
  ]),
)

/** An open Custom Card draft for tests: user-1's 3-cost draft for 3 LP, before its first pick, unless overridden. */
export function testCustomDraft(overrides: Partial<CustomDraft> = {}): CustomDraft {
  return {
    id: 'draft-1',
    kind: 'customDraft',
    uid: 'user-1',
    by: 'user-1',
    at: Timestamp.fromMillis(5000),
    base: 3,
    paidWith: 'lp',
    cost: 3,
    entryId: 'e-pay',
    pickTypes: [],
    pickCosts: [],
    offered: ['Caster', 'Draw', 'Gold'],
    offerCost: 3,
    required: 3,
    bonusLeft: 0,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cardId: null,
    holdingId: null,
    refundEntryId: null,
    ...overrides,
  }
}

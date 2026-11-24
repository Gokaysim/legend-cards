import type { PillTone } from '@/components/ui/Pill'
import { costChange, NO_VALUE, rarityLabel, type SetName, setLabel } from '@/features/cards/display'
import type { Card, HandCard } from '@/features/cards/schema'

/** One label under the face in a card's details. */
export type InfoPill = { label: string; tone?: PillTone; isMuted?: boolean }

/**
 * The cost as the details' label says it: "Cost 1", or with a hand cost that differs from the card's own, "Cost 1
 * (temel: 3)" or "Cost 3 (temel: X)", "—" standing in for a missing cost. A card without a cost and without a hand
 * cost has none. It differs as the face's badge does (`costChange`), so the label names "temel" exactly when the
 * badge shows (design D3 of `show-hand-cost-on-x-and-d6-cards`).
 */
export function costInfo(card: Pick<Card, 'cost'>, handCost: string | null): string | null {
  if (costChange(card.cost, handCost) !== null)
    return `Cost ${handCost ?? NO_VALUE} (temel: ${card.cost ?? NO_VALUE})`
  return card.cost === null ? null : `Cost ${card.cost}`
}

/**
 * The labels under the face in a held card's details (spec: card-holdings, "The card's face and labels in the
 * details"; design D3 of `redesign-selected-card-panel`): the set, the rarity in its frame's color, the cost and the
 * mechanic pack. A Cursed card has only "Cursed" and its cost, a Blessed card "Blessed", its cost and its mechanic
 * pack. They replace v2.2.8's grey lines; the card's name and text are on its face.
 */
export function holdingInfo(card: HandCard, handCost: string | null, setName: SetName): InfoPill[] {
  const cost = costInfo(card, handCost)
  const costPill: InfoPill[] = cost === null ? [] : [{ label: cost }]
  // A Custom Card has no set, rarity or mechanic pack (spec: custom-cards, "Custom Card fields").
  if (card.kind === 'custom') return [{ label: 'Custom Card' }, ...costPill]
  const mechanicPack: InfoPill[] =
    card.mechanicPack === null ? [] : [{ label: card.mechanicPack, isMuted: true }]
  if (card.kind === 'cursed') return [{ label: 'Cursed', tone: 'cursed' }, ...costPill]
  if (card.kind === 'blessed') {
    return [{ label: 'Blessed', tone: 'blessed' }, ...costPill, ...mechanicPack]
  }
  const rarity = rarityLabel(card)
  return [
    { label: setLabel(card, setName) ?? NO_VALUE },
    // A rarity's pill takes its frame's color: purple Common, gold Rare.
    ...(rarity === null || card.rarity === null ? [] : [{ label: rarity, tone: card.rarity }]),
    ...costPill,
    ...mechanicPack,
  ]
}

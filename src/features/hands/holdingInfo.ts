import type { PillTone } from '@/components/ui/Pill'
import { cardFrame, NO_VALUE, rarityLabel, type SetName, setLabel } from '@/features/cards/display'
import type { Card } from '@/features/cards/schema'

/** One label under the face in a card's details. */
export type InfoPill = { label: string; tone?: PillTone; isMuted?: boolean }

/**
 * The cost as the details' label says it: "Cost 1", or with a hand cost that differs from the card's own, "Cost 1
 * (temel: 3)", "—" standing in for a missing cost. A card without a cost and without a hand cost has none.
 */
export function costInfo(card: Pick<Card, 'cost'>, handCost: string | null): string | null {
  if (handCost !== card.cost)
    return `Cost ${handCost ?? NO_VALUE} (temel: ${card.cost ?? NO_VALUE})`
  return card.cost === null ? null : `Cost ${card.cost}`
}

/**
 * The labels under the face in a held card's details (spec: card-holdings, "The card's face and labels in the
 * details"; design D3 of `redesign-selected-card-panel`): the set, the rarity in its frame's color, the cost and the
 * mechanic pack. A Cursed card has only "Cursed" and its cost, a Blessed card "Blessed", its cost and its mechanic
 * pack. They replace v2.2.8's grey lines; the card's name and text are on its face.
 */
export function holdingInfo(card: Card, handCost: string | null, setName: SetName): InfoPill[] {
  const cost = costInfo(card, handCost)
  const costPill: InfoPill[] = cost === null ? [] : [{ label: cost }]
  const mechanicPack: InfoPill[] =
    card.mechanicPack === null ? [] : [{ label: card.mechanicPack, isMuted: true }]
  if (card.kind === 'cursed') return [{ label: 'Cursed', tone: 'cursed' }, ...costPill]
  if (card.kind === 'blessed') {
    return [{ label: 'Blessed', tone: 'blessed' }, ...costPill, ...mechanicPack]
  }
  const rarity = rarityLabel(card)
  return [
    { label: setLabel(card, setName) ?? NO_VALUE },
    ...(rarity === null ? [] : [{ label: rarity, tone: cardFrame(card) }]),
    ...costPill,
    ...mechanicPack,
  ]
}

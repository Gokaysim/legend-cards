import type { CustomCard } from '@/features/cards/schema'

import { cardCost, costLine, effectLine } from './draftRules'

/**
 * A Custom Card's effects in its details (spec: custom-cards, "The Custom Card's details"): each with its type, cost and
 * text, and how its cost was reached, "3 + 2 (Effects) − 2 (Cursed) = 3", or only the cost when nothing changes it.
 */
export function CustomCardEffects({ card }: { card: CustomCard }) {
  return (
    <section aria-label="Efektler" className="flex w-full flex-col gap-2">
      <p className="text-[13px] text-ink">
        <span className="text-ink-muted">Maliyet: </span>
        <span className="font-semibold tabular-nums">
          {costLine(cardCost(card.base, card.effects))}
        </span>
      </p>
      <ol className="flex flex-col gap-1.5">
        {card.effects.map((effect) => (
          <li
            key={effect.type}
            lang="en"
            className="rounded-lg border border-line bg-pane-raised px-2.5 py-1.5 text-[13px] break-words text-ink"
          >
            {effectLine(effect)}
          </li>
        ))}
      </ol>
    </section>
  )
}

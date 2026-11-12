import { DM_ONLY_LABEL } from '@/features/cards/status'
import type { Subscription } from '@/lib/firestore/subscription'

import { type DefinitionStatus, STATUS_LABELS } from './status'

/** What the DM's status filter shows: one status, or every definition. */
export type StatusFilterValue = DefinitionStatus | 'all'

/** What the DM's filter on the card screens shows: a status, every card, or the DM-only cards of every status. */
export type CardFilterValue = StatusFilterValue | 'dmOnly'

/** One choice of a status filter. */
export type StatusFilterOption<V extends string> = { value: V; label: string }

/** The True Words filter's choices, in order. It starts at "Yayında". */
export const STATUS_FILTER_OPTIONS: readonly StatusFilterOption<StatusFilterValue>[] = [
  { value: 'active', label: STATUS_LABELS.active },
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'retired', label: STATUS_LABELS.retired },
  { value: 'all', label: 'Hepsi' },
]

/**
 * The card screens' choices, in order: the statuses, "DM'e özel", then "Hepsi". It starts at "Yayında" (spec:
 * card-library, "The DM's status filter").
 */
export const CARD_FILTER_OPTIONS: readonly StatusFilterOption<CardFilterValue>[] = [
  ...STATUS_FILTER_OPTIONS.slice(0, 3),
  { value: 'dmOnly', label: DM_ONLY_LABEL },
  { value: 'all', label: 'Hepsi' },
]

export const DEFAULT_STATUS_FILTER: StatusFilterValue = 'active'

/** The definitions the filter keeps, with the subscription's loading and error states as they are. */
export function filterByStatus<T extends { status: DefinitionStatus }>(
  definitions: Subscription<T[]>,
  value: StatusFilterValue,
): Subscription<T[]> {
  if (definitions.status !== 'ready' || value === 'all') return definitions
  return {
    ...definitions,
    data: definitions.data.filter((definition) => definition.status === value),
  }
}

/** The cards the card screens' filter keeps: "DM'e özel" keeps the DM-only cards of every status. */
export function filterCards<T extends { status: DefinitionStatus; dmOnly: boolean }>(
  cards: Subscription<T[]>,
  value: CardFilterValue,
): Subscription<T[]> {
  if (value !== 'dmOnly') return filterByStatus(cards, value)
  if (cards.status !== 'ready') return cards
  return { ...cards, data: cards.data.filter((card) => card.dmOnly) }
}

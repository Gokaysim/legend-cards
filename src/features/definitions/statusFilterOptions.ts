import { DM_ONLY_MARK } from '@/features/cards/status'
import type { Subscription } from '@/lib/firestore/subscription'

import { type DefinitionStatus, STATUS_LABELS } from './status'

/** What the DM's status filter shows: one status, or every definition. */
export type StatusFilterValue = DefinitionStatus | 'all'

/**
 * What the DM's filter on the definition screens shows: a status, every definition, or the hidden ones of every status
 * (design D8 of unify-cards-and-true-words): those whose "Listede görünür" is off.
 */
export type CardFilterValue = StatusFilterValue | 'hidden'

/** One choice of a status filter. */
export type StatusFilterOption<V extends string> = { value: V; label: string }

/** The statuses' choices, in order, then "Hepsi". */
export const STATUS_FILTER_OPTIONS: readonly StatusFilterOption<StatusFilterValue>[] = [
  { value: 'active', label: STATUS_LABELS.active },
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'retired', label: STATUS_LABELS.retired },
  { value: 'all', label: 'Hepsi' },
]

/**
 * The definition screens' choices, in order: the statuses, "🔒 DM", then "Hepsi". It starts at "Yayında" (spec:
 * card-library, "The DM's status filter"; true-words, "True Words screen").
 */
export const CARD_FILTER_OPTIONS: readonly StatusFilterOption<CardFilterValue>[] = [
  ...STATUS_FILTER_OPTIONS.slice(0, 3),
  { value: 'hidden', label: DM_ONLY_MARK },
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

/** The definitions the filter keeps: "🔒 DM" keeps those of every status whose "Listede görünür" is off. */
export function filterCards<T extends { status: DefinitionStatus; isInLibrary: boolean }>(
  cards: Subscription<T[]>,
  value: CardFilterValue,
): Subscription<T[]> {
  if (value !== 'hidden') return filterByStatus(cards, value)
  if (cards.status !== 'ready') return cards
  return { ...cards, data: cards.data.filter((card) => !card.isInLibrary) }
}

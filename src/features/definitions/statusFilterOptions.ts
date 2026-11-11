import type { Subscription } from '@/lib/firestore/subscription'

import { type DefinitionStatus, STATUS_LABELS } from './status'

/** What the DM's status filter shows: one status, or every definition. */
export type StatusFilterValue = DefinitionStatus | 'all'

/** The filter's choices, in order. It starts at "Yayında" (spec: card-library, "The DM's status filter"). */
export const STATUS_FILTER_OPTIONS: readonly { value: StatusFilterValue; label: string }[] = [
  { value: 'active', label: STATUS_LABELS.active },
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'retired', label: STATUS_LABELS.retired },
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

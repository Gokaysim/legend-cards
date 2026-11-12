import type { DetailsBadge } from '@/components/ui/Badge'

import type { HandEntry } from './handEntries'

/**
 * The marks of a held card at the top of its details (spec: card-holdings, "The card's face and labels in the
 * details"): "Aktif" while it is switched active, and "Ek kopya" for an extra copy the DM gave.
 */
export function holdingBadges(entry: Pick<HandEntry, 'holding' | 'isExtraCopy'>): DetailsBadge[] {
  const badges: DetailsBadge[] = []
  if (entry.holding.active) badges.push({ label: 'Aktif', tone: 'active' })
  if (entry.isExtraCopy) badges.push({ label: 'Ek kopya', tone: 'plain' })
  return badges
}

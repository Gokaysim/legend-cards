import type { DetailsBadge } from '@/components/ui/Badge'

import type { KnownWordEntry } from './trueWordsContext'

/** The marks of a known word at the top of its details (spec: true-words, "True Words tab on the hand screen"). */
export function wordBadges(entry: Pick<KnownWordEntry, 'record'>): DetailsBadge[] {
  return entry.record.active ? [{ label: 'Aktif', tone: 'active' }] : []
}

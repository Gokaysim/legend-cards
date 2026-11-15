import { NO_VALUE } from '@/features/cards/display'
import { formatShortDate } from '@/lib/days'

import { averageHeldDays, type CardStats, heldDays } from './cardHistory'
import type { NameOf } from './historyText'

// The words of the stat tiles (design V1 · Künye and S1 · Tablo of add-card-and-set-stats).

const decimal = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

/** "DM 1 · Çekiliş 1 · Paket 1", or "henüz yok" when nothing reached a hand. */
export function reachedText(reached: CardStats['reached']): string {
  return reached.total === 0
    ? 'henüz yok'
    : `DM ${reached.dm} · Çekiliş ${reached.draw} · Paket ${reached.pack}`
}

/** "toplam 2 LP ödendi", or "henüz yok" without a use. */
export function lpPaidText(stats: Pick<CardStats, 'used' | 'lpPaid'>): string {
  return stats.used === 0 ? 'henüz yok' : `toplam ${stats.lpPaid} LP ödendi`
}

/** How often the packs that showed the card took it: chosen, or for a Cursed card gone to the hand. */
export function takenText(stats: Pick<CardStats, 'shown' | 'taken'>, isCursed: boolean): string {
  if (stats.shown === 0 && stats.taken === 0) return NO_VALUE
  return `${stats.taken} kez ${isCursed ? 'ele geçti' : 'seçildi'}`
}

/** The holders' names in Turkish alphabetical order, or "—". */
export function holderNamesText(holders: readonly string[], nameOf: NameOf): string {
  if (holders.length === 0) return NO_VALUE
  return holders
    .map(nameOf)
    .sort((a, b) => a.localeCompare(b, 'tr'))
    .join(', ')
}

/** "Elde kaldı": "14 gün" with "ortalama 3,5 gün", or "—" twice for a card never held. */
export function heldText(stats: Pick<CardStats, 'heldMs' | 'holdings'>): {
  value: string
  sub: string
} {
  const days = heldDays(stats)
  const average = averageHeldDays(stats)
  if (days === null || average === null) return { value: NO_VALUE, sub: NO_VALUE }
  return { value: `${days} gün`, sub: `ortalama ${decimal.format(average)} gün` }
}

/** "Son kullanım": "14 Kas 2026" with "ilk kez 20 Eki 2026", or "—" with "hiç ele geçmedi". */
export function lastUseText(stats: Pick<CardStats, 'lastUsedAt' | 'firstHeldAt'>): {
  value: string
  sub: string
} {
  return {
    value: stats.lastUsedAt === null ? NO_VALUE : formatShortDate(new Date(stats.lastUsedAt)),
    sub:
      stats.firstHeldAt === null
        ? 'hiç ele geçmedi'
        : `ilk kez ${formatShortDate(new Date(stats.firstHeldAt))}`,
  }
}

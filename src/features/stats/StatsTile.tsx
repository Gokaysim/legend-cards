import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type StatsTileProps = {
  label: string
  value: ReactNode
  /** A short line under the value: its parts, its average, or who. */
  sub: string
  /** A smaller value, for a date. */
  isSmallValue?: boolean
  /**
   * The label's language, for an English game term such as "Discard": its capitals then follow English, not Turkish
   * ("DISCARD", not "DİSCARD").
   */
  labelLang?: 'en'
}

/**
 * One tile of a statistics page, inside its `<dl>`: the label small and in capitals, the value large in gold, and a
 * line under it (design V1 · Künye and S1 · Tablo of add-card-and-set-stats).
 */
export function StatsTile({ label, value, sub, isSmallValue = false, labelLang }: StatsTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-pane-raised px-3 py-2.5">
      <dt lang={labelLang} className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'font-semibold text-gold tabular-nums',
          isSmallValue ? 'pt-1 text-xl' : 'text-2xl',
        )}
      >
        {value}
      </dd>
      <dd className="text-xs break-words text-ink-muted">{sub}</dd>
    </div>
  )
}

/** The tiles' grid: as many columns of at least 150 px as fit, so the tiles wrap on a phone. */
export function StatsTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <dl aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
      {children}
    </dl>
  )
}

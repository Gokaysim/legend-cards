import type { ReactNode } from 'react'

import { Mascot } from '@/features/art/Mascot'

export type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** The screen's Cardmaker picture stem (`screens.ts`), shown at the right of the title when it has a picture. */
  mascot?: string | null
}

/**
 * The title row at the top of every screen. The Cardmaker stands at the right of the title, at most 72 px high on
 * phones and 112 px from `sm`, and never wider than a third of the row. The actions wrap below when they do not fit.
 */
export function PageHeader({ title, description, actions, mascot }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 grow items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {mascot ? <Mascot stem={mascot} className="max-h-18 max-w-1/3 sm:max-h-28" /> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

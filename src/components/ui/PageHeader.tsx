import type { ReactNode } from 'react'

import { CornerCardmaker } from '@/features/art/CornerCardmaker'
import { Mascot } from '@/features/art/Mascot'
import { useWideHover } from '@/lib/useWideHover'

export type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** The screen's Cardmaker picture stem (`screens.ts`), shown at the right of the title when it has a picture. */
  mascot?: string | null
  /**
   * `corner` stands the Cardmaker in the window's bottom-right corner instead, on a wide window with a mouse (spec:
   * card-images, "The Cardmaker in the corner"; design D5 of `polish-cards-packs-and-mascots`). Elsewhere she stays by
   * the title. Defaults to `title`.
   */
  mascotPlacement?: 'title' | 'corner'
}

/**
 * The title row at the top of every screen. The Cardmaker stands at the right of the title, at most 112 px high and
 * never wider than a third of the row, or in the corner where `mascotPlacement` asks for it. On a phone she does not
 * show (`Mascot`). The actions wrap below when they do not fit.
 */
export function PageHeader({
  title,
  description,
  actions,
  mascot,
  mascotPlacement = 'title',
}: PageHeaderProps) {
  const isWideHover = useWideHover()
  const isInCorner = mascotPlacement === 'corner' && isWideHover
  // The corner Cardmaker is fixed, outside the title row: she takes no room in the page's layout.
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 grow items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
          </div>
          {mascot && !isInCorner ? (
            <Mascot stem={mascot} className="max-h-18 max-w-1/3 sm:max-h-28" />
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {mascot && isInCorner ? <CornerCardmaker stem={mascot} /> : null}
    </>
  )
}

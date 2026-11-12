import type { ReactNode } from 'react'

import { NeutralCardBack } from '@/features/art/NeutralCardBack'

import { PageHeader } from './PageHeader'

export type PlaceholderProps = {
  title: string
  /** Working controls for the header, for example a link back to a parent screen. */
  actions?: ReactNode
  /** The screen's Cardmaker picture stem. */
  mascot?: string | null
}

/**
 * Stand-in for a screen whose feature is not built yet (spec: app-shell, "Placeholder screens"; design D7 of
 * `polish-cards-packs-and-mascots`): the title row, then the "Yakında" panel. The neutral card back of a random draw
 * drifts slowly with a light crossing it, over "Yakında" in gold, an ornament line and the not-ready note. Under
 * reduced motion the card stands still. The screen's Cardmaker stands in the corner on a wide window with a mouse.
 */
export function Placeholder({ title, actions, mascot }: PlaceholderProps) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} actions={actions} mascot={mascot} mascotPlacement="corner" />
      <div className="flex flex-col items-center gap-7 rounded-2xl border border-line bg-pane px-4 py-12 text-center sm:py-16">
        <div data-coming-soon-card className="relative">
          {/* A soft gold light behind the card. */}
          <div
            aria-hidden="true"
            className="absolute -inset-10 rounded-full bg-radial from-gold/15 to-transparent to-70%"
          />
          <div className="relative w-32 motion-safe:animate-card-drift motion-reduce:-rotate-3 sm:w-36">
            <NeutralCardBack className="relative overflow-hidden shadow-xl">
              <span
                data-glint
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-glint/40 to-transparent opacity-0 motion-safe:animate-back-glint"
              />
            </NeutralCardBack>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          {/* Written in mixed case, so screen readers say the word; the Turkish uppercase draws "YAKINDA". The padding
              balances the tracking after the last letter, so the word stays centered. */}
          <h2
            lang="tr"
            className="pl-[0.35em] text-4xl font-extrabold tracking-[0.35em] text-gold uppercase sm:text-5xl"
          >
            Yakında
          </h2>
          <div aria-hidden="true" className="flex w-48 items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-sm text-gold">✦</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <p className="text-sm text-ink-muted">Bu ekran henüz hazır değil.</p>
        </div>
      </div>
    </section>
  )
}

import { type ReactNode, useId } from 'react'

import { EmptyCardSlot } from '@/components/ui/EmptyCardSlot'

export type HandDetailsPanelProps = {
  /** "Seçili Kart" or "Seçili True Word": the small label that names the panel. */
  label: string
  /** The selection's marks at the label's right, for example "Aktif" and "Ek kopya". */
  badges?: ReactNode
  /** The selection's name, the details' heading for screen readers, or `null` while nothing is selected. */
  name: string | null
  /** The empty card slot's title and hint while nothing is selected. */
  empty: { title: string; hint: string }
  /** The details of what is selected. */
  children?: ReactNode
}

/**
 * The panel beside the hand on a wide window (v2.2.8's `.sidebar-panel`; spec: card-holdings, "Card details beside the
 * hand"; design D1 of `redesign-selected-card-panel`): a small upper-case label with the selection's marks at its
 * right, then the details, or an empty card slot asking to select something. The selection's name heads the details
 * for screen readers, while its picture shows the name on screen. It stays in view while the page scrolls, and scrolls
 * on its own when it is taller than the window.
 */
export function HandDetailsPanel({ label, badges, name, empty, children }: HandDetailsPanelProps) {
  const ids = useId()
  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-pane p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
    >
      <header className="flex min-h-6 items-center justify-between gap-2">
        <h2
          id={`${ids}-title`}
          className="text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase"
        >
          {label}
        </h2>
        {name === null ? null : badges}
      </header>
      {name === null ? (
        <EmptyCardSlot title={empty.title} hint={empty.hint} />
      ) : (
        <>
          <h3 lang="en" className="sr-only">
            {name}
          </h3>
          {children}
        </>
      )}
    </section>
  )
}

import { type ReactNode, useId } from 'react'

export type HandDetailsPanelProps = {
  /** "Seçili Kart" or "Seçili True Word". */
  title: string
  /** The name of what is selected, as the details' heading, or `null` while nothing is selected. */
  name: string | null
  /** What the panel says while nothing is selected. */
  emptyText: string
  /** The details of what is selected. */
  children?: ReactNode
}

/**
 * The panel beside the hand on a wide window (v2.2.8's `.sidebar-panel`; spec: card-holdings, "Card details beside the
 * hand"; design D3): its title, then the name and the details of what is selected, or a line asking to select
 * something. It stays in view while the page scrolls, and scrolls on its own when it is taller than the window.
 */
export function HandDetailsPanel({ title, name, emptyText, children }: HandDetailsPanelProps) {
  const ids = useId()
  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-pane p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
    >
      <h2 id={`${ids}-title`} className="font-semibold text-ink">
        {title}
      </h2>
      {name === null ? (
        <p className="text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <>
          <h3 lang="en" className="font-semibold break-words text-gold">
            {name}
          </h3>
          {children}
        </>
      )}
    </section>
  )
}

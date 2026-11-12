import { type ReactNode, useId } from 'react'

export type ToolSectionProps = {
  /** The section's heading, for example "DM araçları". */
  title: string
  children: ReactNode
}

/**
 * A group of controls under a heading drawn between two lines (design D2 of `redesign-selected-card-panel`): the DM's
 * tools in a card's or word's details.
 */
export function ToolSection({ title, children }: ToolSectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <h3 id={id} className="text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase">
          {title}
        </h3>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {children}
    </section>
  )
}

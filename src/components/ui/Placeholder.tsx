import type { ReactNode } from 'react'

import { PageHeader } from './PageHeader'

export type PlaceholderProps = {
  title: string
  /** Working controls for the header, for example a link back to a parent screen. */
  actions?: ReactNode
  /** The screen's Cardmaker picture stem. */
  mascot?: string | null
}

/** Stand-in for a screen whose feature is not built yet. */
export function Placeholder({ title, actions, mascot }: PlaceholderProps) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} actions={actions} mascot={mascot} />
      <div className="rounded-2xl border border-line bg-pane p-6">
        <p className="text-ink-muted">Bu ekran henüz hazır değil.</p>
      </div>
    </section>
  )
}

import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'

import { RulesContent } from './RulesContent'

/** Kurallar: the table rules as the Cardmaker tells them. Static text, the same for everyone, with no controls. */
export function RulesPage() {
  const screen = screenById('rules')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screen.label} mascot={screen.mascot} mascotPlacement="corner" />
      <RulesContent />
    </section>
  )
}

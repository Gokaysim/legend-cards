import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the rules text is reviewed by the DM and built as a feature. */
export function RulesPage() {
  const screen = screenById('rules')
  return <Placeholder title={screen.label} mascot={screen.mascot} />
}

import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function CustomDraftPage() {
  const screen = screenById('custom-draft')
  return <Placeholder title={screen.label} mascot={screen.mascot} />
}

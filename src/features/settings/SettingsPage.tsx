import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function SettingsPage() {
  const screen = screenById('settings')
  return <Placeholder title={screen.label} mascot={screen.mascot} />
}

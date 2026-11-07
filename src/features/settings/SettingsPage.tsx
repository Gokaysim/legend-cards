import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function SettingsPage() {
  return <Placeholder title={screenById('settings').label} />
}

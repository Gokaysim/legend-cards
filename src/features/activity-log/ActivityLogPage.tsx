import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function ActivityLogPage() {
  return <Placeholder title={screenById('activity-log').label} />
}

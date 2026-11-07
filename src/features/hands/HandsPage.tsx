import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function HandsPage() {
  return <Placeholder title={screenById('hands').label} />
}

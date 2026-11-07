import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function CustomDraftPage() {
  return <Placeholder title={screenById('custom-draft').label} />
}

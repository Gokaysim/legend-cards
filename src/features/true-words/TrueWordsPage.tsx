import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function TrueWordsPage() {
  return <Placeholder title={screenById('true-words').label} />
}

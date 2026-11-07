import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function CursedDeckPage() {
  return <Placeholder title={screenById('cursed-deck').label} />
}

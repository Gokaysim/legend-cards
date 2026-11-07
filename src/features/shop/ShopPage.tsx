import { screenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

/** Placeholder until the feature is built. */
export function ShopPage() {
  return <Placeholder title={screenById('shop').label} />
}

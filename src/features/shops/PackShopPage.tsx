import { shopScreenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

import { BackToShopsLink } from './BackToShopsLink'

/** Placeholder until the feature is built. */
export function PackShopPage() {
  return <Placeholder title={shopScreenById('pack-shop').label} actions={<BackToShopsLink />} />
}

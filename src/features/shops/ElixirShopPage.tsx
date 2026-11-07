import { shopScreenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

import { BackToShopsLink } from './BackToShopsLink'

/** Placeholder until the feature is built. */
export function ElixirShopPage() {
  return <Placeholder title={shopScreenById('elixir-shop').label} actions={<BackToShopsLink />} />
}

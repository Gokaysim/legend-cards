import { shopScreenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

import { BackToShopsLink } from './BackToShopsLink'

/** Placeholder until the feature is built. */
export function ElixirShopPage() {
  const screen = shopScreenById('elixir-shop')
  return <Placeholder title={screen.label} mascot={screen.mascot} actions={<BackToShopsLink />} />
}

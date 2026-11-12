import { shopScreenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'

import { BackToShopsLink } from './BackToShopsLink'

/**
 * Placeholder until the feature is built. Its Cardmaker stands by the title, or in the bottom-right corner on a wide
 * window with a mouse, as on every unbuilt screen (spec: card-images, "The Cardmaker in the corner").
 */
export function ElixirShopPage() {
  const screen = shopScreenById('elixir-shop')
  return <Placeholder title={screen.label} mascot={screen.mascot} actions={<BackToShopsLink />} />
}

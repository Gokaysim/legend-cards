import { shopScreenById } from '@/app/screens'
import { Placeholder } from '@/components/ui/Placeholder'
import { CornerCardmaker } from '@/features/art/CornerCardmaker'
import { useWideHover } from '@/lib/useWideHover'

import { BackToShopsLink } from './BackToShopsLink'

/**
 * Placeholder until the feature is built. Its Cardmaker stands by the title, or in the bottom-right corner on a wide
 * window with a mouse, as on the other shop screens (spec: card-images, design D2).
 */
export function ElixirShopPage() {
  const screen = shopScreenById('elixir-shop')
  const isCorner = useWideHover()
  return (
    <>
      <Placeholder
        title={screen.label}
        mascot={isCorner ? null : screen.mascot}
        actions={<BackToShopsLink />}
      />
      {isCorner ? <CornerCardmaker stem={screen.mascot} /> : null}
    </>
  )
}

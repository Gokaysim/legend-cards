import { Link } from 'react-router'

import { screenById, SHOP_SCREENS, type ShopScreen, shopScreenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { useArt } from '@/features/art/artContext'
import { useSpeechTrigger } from '@/features/art/cardmakerSpeech'
import { CardmakerSpeechProvider } from '@/features/art/CardmakerSpeechProvider'
import { CornerCardmaker } from '@/features/art/CornerCardmaker'
import { cn } from '@/lib/cn'
import { useWideHover } from '@/lib/useWideHover'

/**
 * The Shops hub: one large link card for each shop sub-screen. Its Cardmaker is `cardmaker_keep`, and the Pack Shop's
 * while that has no picture (spec: card-images). She stands by the title, or in the bottom-right corner on a wide
 * window with a mouse (design D2), where each shop makes her say what it offers (spec: cardmaker-speech).
 */
export function ShopsPage() {
  const art = useArt()
  const isCorner = useWideHover()
  const { label, mascot: ownMascot } = screenById('shops')
  const mascot =
    ownMascot !== null && art.mascotUrl(ownMascot) !== null
      ? ownMascot
      : shopScreenById('pack-shop').mascot
  // She speaks only where she stands in the corner, so only then does her bubble hold the descriptions.
  const canSpeak = isCorner && art.mascotUrl(mascot) !== null
  return (
    <CardmakerSpeechProvider isEnabled={canSpeak}>
      <section className="flex flex-col gap-6">
        <PageHeader title={label} mascot={isCorner ? null : mascot} />
        {isCorner ? <CornerCardmaker stem={mascot} /> : null}
        <ul className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {SHOP_SCREENS.map((shop) => (
            <ShopChoice key={shop.id} shop={shop} isSummaryInBubble={canSpeak} />
          ))}
        </ul>
      </section>
    </CardmakerSpeechProvider>
  )
}

/**
 * One shop's card. Its description is the link's description for screen readers everywhere. Where the Cardmaker's
 * bubble can say it, it is hidden from sight, as in v2.2.8; elsewhere it shows under the shop's name.
 */
function ShopChoice({ shop, isSummaryInBubble }: { shop: ShopScreen; isSummaryInBubble: boolean }) {
  const speechTrigger = useSpeechTrigger({
    title: shop.label,
    summary: shop.summary,
    speech: shop.speech,
  })
  return (
    <li {...speechTrigger}>
      <Link
        to={shop.path}
        aria-labelledby={`shop-${shop.id}-label`}
        aria-describedby={`shop-${shop.id}-summary`}
        className="flex h-full min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-pane p-6 text-center transition hover:border-gold hover:bg-pane-raised hover:shadow-xl motion-safe:hover:-translate-y-1.25 motion-safe:focus-visible:-translate-y-1.25"
      >
        <span aria-hidden="true" className="text-6xl leading-none">
          {shop.icon}
        </span>
        <span id={`shop-${shop.id}-label`} className="text-xl font-semibold text-gold">
          {shop.label}
        </span>
        <span
          id={`shop-${shop.id}-summary`}
          className={cn('text-sm text-ink-muted', isSummaryInBubble && 'sr-only')}
        >
          {shop.summary}
        </span>
      </Link>
    </li>
  )
}

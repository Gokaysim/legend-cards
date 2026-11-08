import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useDeckCards } from '@/features/cards/cardsContext'
import { useDeckStatus } from '@/features/hands/cardStatus'

/** Kart kütüphanesi: every active normal and Blessed card with its pool status, live. */
export function LibraryPage() {
  const cards = useDeckCards('legend')
  const status = useDeckStatus('legend')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screenById('library').label} />
      <CardBrowser deck="legend" cards={cards} status={status} />
    </section>
  )
}

import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useDeckCards } from '@/features/cards/cardsContext'

/** Kart kütüphanesi: every active normal and Blessed card, live. */
export function LibraryPage() {
  const cards = useDeckCards('legend')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screenById('library').label} />
      <CardBrowser deck="legend" cards={cards} />
    </section>
  )
}

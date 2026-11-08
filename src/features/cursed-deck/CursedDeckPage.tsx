import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useDeckCards } from '@/features/cards/cardsContext'

/** Cursed Deck: every active Cursed card, live. */
export function CursedDeckPage() {
  const cards = useDeckCards('cursed')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screenById('cursed-deck').label} />
      <CardBrowser deck="cursed" cards={cards} />
    </section>
  )
}

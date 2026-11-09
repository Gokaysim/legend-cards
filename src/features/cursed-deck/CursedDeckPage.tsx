import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useDeckCards } from '@/features/cards/cardsContext'
import { useDeckStatus } from '@/features/hands/cardStatus'

/** Cursed Deck: every active Cursed card with the players holding it, live. */
export function CursedDeckPage() {
  const cards = useDeckCards('cursed')
  const status = useDeckStatus('cursed')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('cursed-deck').label}
        mascot={screenById('cursed-deck').mascot}
      />
      <CardBrowser deck="cursed" cards={cards} status={status} />
    </section>
  )
}

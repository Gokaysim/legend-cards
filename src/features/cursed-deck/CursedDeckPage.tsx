import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useCardEditing } from '@/features/definitions/useCardEditing'
import { useDeckStatus } from '@/features/hands/cardStatus'

/**
 * Cursed Deck: every active Cursed card with the players holding it, live. The DM also adds and edits Cursed cards
 * here, and browses the drafts and the retired ones through the status filter.
 */
export function CursedDeckPage() {
  const editing = useCardEditing('cursed')
  const status = useDeckStatus('cursed')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('cursed-deck').label}
        mascot={screenById('cursed-deck').mascot}
        actions={editing.addButton}
      />
      <CardBrowser deck="cursed" cards={editing.cards} status={status} {...editing.browserProps} />
      {editing.dialog}
    </section>
  )
}

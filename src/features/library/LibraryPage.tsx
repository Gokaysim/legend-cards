import { useState } from 'react'

import { screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useCardEditing } from '@/features/definitions/useCardEditing'
import { useDeckStatus } from '@/features/hands/cardStatus'

import { PoolDistributionDialog } from './PoolDistributionDialog'

/**
 * Kart kütüphanesi: every active normal and Blessed card with its pool status, live, and the pool's distribution. The
 * DM also adds and edits cards here, and browses the drafts and the retired cards through the status filter.
 */
export function LibraryPage() {
  const editing = useCardEditing('legend')
  const status = useDeckStatus('legend')
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('library').label}
        mascot={screenById('library').mascot}
        actions={
          <>
            {editing.addButton}
            <Button onClick={() => setIsDistributionOpen(true)}>▥ Havuz Dağılımı</Button>
          </>
        }
      />
      <CardBrowser deck="legend" cards={editing.cards} status={status} {...editing.browserProps} />
      {isDistributionOpen ? (
        <PoolDistributionDialog onClose={() => setIsDistributionOpen(false)} />
      ) : null}
      {editing.dialog}
    </section>
  )
}

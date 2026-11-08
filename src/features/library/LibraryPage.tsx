import { useState } from 'react'

import { screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useDeckCards } from '@/features/cards/cardsContext'
import { useDeckStatus } from '@/features/hands/cardStatus'

import { PoolDistributionDialog } from './PoolDistributionDialog'

/** Kart kütüphanesi: every active normal and Blessed card with its pool status, live, and the pool's distribution. */
export function LibraryPage() {
  const cards = useDeckCards('legend')
  const status = useDeckStatus('legend')
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('library').label}
        actions={<Button onClick={() => setIsDistributionOpen(true)}>▥ Havuz Dağılımı</Button>}
      />
      <CardBrowser deck="legend" cards={cards} status={status} />
      {isDistributionOpen ? (
        <PoolDistributionDialog onClose={() => setIsDistributionOpen(false)} />
      ) : null}
    </section>
  )
}

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { useCards } from '@/features/cards/cardsContext'
import { cursedPool } from '@/features/cards/pool'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { useIsDm } from '@/features/users/usersContext'

import { DrawDialog } from './DrawDialog'
import type { DrawKind } from './schema'

/**
 * "🎲 Kart Çek" and "☠ Cursed Kart Çek" on a hand, for the hand's owner and the DM; other players see neither.
 * "🎲 Kart Çek" opens its dialog, which explains when nothing can be drawn or LP is short. The Cursed button is
 * disabled while the Cursed Deck has no active cards. Both are disabled while a pack is open: the table waits.
 */
export function DrawButtons({ owner }: { owner: UserProfile }) {
  const auth = useAuth()
  const isDm = useIsDm()
  const cards = useCards()
  const isTableBusy = useIsTableBusy()
  const [mode, setMode] = useState<DrawKind | null>(null)
  const hasCursedCards = useMemo(
    () => cards.status === 'ready' && cursedPool(cards.data).length > 0,
    [cards],
  )

  const isOwner = auth.status === 'signedIn' && auth.user.uid === owner.id
  if (!isOwner && !isDm) return null
  return (
    <>
      <Button
        disabled={isTableBusy}
        title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
        onClick={() => setMode('random')}
      >
        🎲 Kart Çek
      </Button>
      <Button
        disabled={!hasCursedCards || isTableBusy}
        title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
        onClick={() => setMode('cursed')}
      >
        ☠ Cursed Kart Çek
      </Button>
      {mode ? <DrawDialog mode={mode} owner={owner} onClose={() => setMode(null)} /> : null}
    </>
  )
}

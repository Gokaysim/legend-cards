import { useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { CURSED_BACK, NEUTRAL_BACK } from '@/features/art/spreadBack'
import { useBlessedShock } from '@/features/art/useBlessedShock'
import { useAuth } from '@/features/auth/authContext'
import { useCards, useCardsById } from '@/features/cards/cardsContext'
import { cursedPool, drawablePool } from '@/features/cards/pool'
import { useIsDm } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'

import { DeckPile } from './DeckPile'
import { useDrawActions } from './drawsContext'
import { FaceDownCard } from './FaceDownCard'
import { DRAW_PRICE, type DrawSession } from './schema'
import { isSessionCardUp, sessionBack, type SessionState } from './sessions'
import { isPaidSession, nameFrom, type ProfileOf, sessionTitle } from './sessionText'
import { DrawSpread } from './table/DrawSpread'
import { DrawTable } from './table/DrawTable'
import { TableChip, TableChips } from './table/TableChip'
import { useShockOnTurn } from './useShockOnTurn'

export type LiveDrawDialogProps = {
  session: DrawSession
  state: SessionState
  profileOf: ProfileOf
  /** While open: shrinks the view to its banner. Once ended: closes it. */
  onClose: () => void
}

/**
 * Another user's draw session, watched live on this device (spec: live-draws, design D6): on the shared table, the
 * deck with the number of cards in its pool and the session's cards in order, face down until turned. The hand's owner
 * and the DM turn them for everyone; the DM can end the session. It names no filters. Once ended, every card shows
 * face up with a line that says where they went, until it is closed.
 */
export function LiveDrawDialog({ session, state, profileOf, onClose }: LiveDrawDialogProps) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const cards = useCards()
  const cardsById = useCardsById()
  const actions = useDrawActions()
  const { shock, overlay } = useBlessedShock()
  const [isEnding, setIsEnding] = useState(false)

  const isOpen = state === 'open'
  const canTurn = isOpen && uid !== null && (uid === session.uid || isDm)
  const ownerName = nameFrom(profileOf, session.uid)
  const byCard = cardsById.status === 'ready' ? cardsById.data : null
  const poolCount = useMemo(() => {
    if (cards.status !== 'ready') return 0
    return (session.kind === 'cursed' ? cursedPool(cards.data) : drawablePool(cards.data)).length
  }, [cards, session.kind])
  const lastIndex = session.draws.length - 1
  const deckBack =
    session.kind === 'cursed'
      ? CURSED_BACK
      : lastIndex >= 0
        ? sessionBack(session, lastIndex)
        : NEUTRAL_BACK

  // The shocked pair for a Blessed card turned while this view is open, here or on another device.
  const turnedKeys = useMemo(() => session.turned.map(String), [session.turned])
  const isBlessedKey = useCallback(
    (key: string) => {
      const cardId = session.draws[Number(key)]?.cardId
      return cardId !== undefined && byCard?.get(cardId)?.kind === 'blessed'
    },
    [session.draws, byCard],
  )
  useShockOnTurn(turnedKeys, isBlessedKey, shock)

  const end = () => {
    if (uid === null) return
    setIsEnding(true)
    actions
      .endDrawSession(session.id, uid)
      .catch(() => undefined)
      .finally(() => setIsEnding(false))
  }

  const count = session.draws.length
  return (
    <Dialog
      title={sessionTitle(session, profileOf, state)}
      onClose={onClose}
      closeLabel={isOpen ? 'Küçült' : '✕ Kapat'}
      className="sm:max-w-5xl"
    >
      <TableChips label="Çekiş">
        {isOpen ? <TableChip variant="live">Canlı</TableChip> : null}
        <TableChip variant={session.kind === 'cursed' ? 'cursed' : 'plain'}>
          {session.kind === 'cursed' ? '☠ Cursed' : '🎲 Rastgele'}
        </TableChip>
        <TableChip>{`${genitive(ownerName)} eline`}</TableChip>
        <TableChip>
          {isPaidSession(session, profileOf) ? `Her kart −${DRAW_PRICE} LP` : 'Ücretsiz'}
        </TableChip>
      </TableChips>

      {isOpen ? null : (
        <p
          role="status"
          className="rounded-lg border border-gold bg-pane-raised p-3 text-sm text-ink"
        >
          {`Çekiş bitti: ${count} kart ${genitive(ownerName)} eline eklendi.`}
        </p>
      )}

      <DrawTable
        tone={session.kind === 'cursed' ? 'cursed' : 'neutral'}
        source={
          <>
            <DeckPile back={deckBack} count={poolCount} />
            <p className="text-xs text-ink-muted">
              {session.kind === 'cursed' ? 'Cursed Deck' : 'Deste'}
            </p>
          </>
        }
      >
        <h3 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
          Çekilen kartlar · {count}
        </h3>
        <DrawSpread
          label="Çekilen kartlar"
          items={session.draws}
          itemKey={(entry) => entry.drawId}
          renderItem={(entry, index) => {
            const card = byCard?.get(entry.cardId)
            return card ? (
              <FaceDownCard
                card={card}
                position={index + 1}
                back={sessionBack(session, index)}
                isRevealed={isSessionCardUp(session, index, state)}
                onReveal={() => {
                  actions.turnDrawCard(session.id, index).catch(() => undefined)
                }}
                canTurn={canTurn}
              />
            ) : (
              <div className="flex aspect-[563/788] items-center justify-center rounded-xl border border-line bg-pane-raised p-3 text-sm text-ink-muted">
                Kart yükleniyor…
              </div>
            )
          }}
        />
      </DrawTable>

      {isOpen && !canTurn ? (
        <p className="text-sm text-ink-muted">{`${ownerName} kartları çeviriyor…`}</p>
      ) : null}
      {isOpen && isDm ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={isEnding} onClick={end}>
            Bitir
          </Button>
        </div>
      ) : null}
      {overlay}
    </Dialog>
  )
}

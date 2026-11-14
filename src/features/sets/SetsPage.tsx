import { useMemo, useState } from 'react'

import { screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { NeutralCardBack } from '@/features/art/NeutralCardBack'
import { usePicture } from '@/features/art/usePicture'
import { useAuth } from '@/features/auth/authContext'
import { useDeckCards, useDeckDefinitions } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { DmOnly } from '@/features/users/DmOnly'
import { useIsDm } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import type { Subscription } from '@/lib/firestore/subscription'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { usePhoneWidth } from '@/lib/usePhoneWidth'

import { type SetFailure, setFailureMessage, toSetFailure } from './errors'
import type { SetIndex } from './index'
import { type CardSet, PACK_LAYOUT_LABELS } from './schema'
import { SetFormDialog } from './SetFormDialog'
import { useSetActions, useSetIndex, useSets } from './setsContext'

/** How many of `cards` each stored set has, by the set's ID. Blessed and Cursed cards have no set. */
function countBySet(cards: Subscription<Card[]>, index: SetIndex): Map<string, number> {
  const counts = new Map<string, number>()
  if (cards.status !== 'ready') return counts
  for (const card of cards.data) {
    if (card.kind !== 'normal' || card.setCode === null) continue
    const set = index.setOf(card.setCode)
    if (set) counts.set(set.id, (counts.get(set.id) ?? 0) + 1)
  }
  return counts
}

/** A set's cardback, small, or the neutral back while it has none. */
function SetBack({ set }: { set: CardSet }) {
  const picture = usePicture(useArt().backUrl(set.code))
  return picture.src === null ? (
    <NeutralCardBack className="w-10 shrink-0 gap-0 rounded-md border p-0 [&>span]:text-base" />
  ) : (
    <CardPicture
      src={picture.src}
      alt={`${set.name} cardback`}
      onError={picture.onError}
      className="w-10 shrink-0 rounded-md"
    />
  )
}

type RowControlsProps = {
  set: CardSet
  isFirst: boolean
  isLast: boolean
  isMoving: boolean
  onMove: (direction: 'up' | 'down') => void
  onEdit: () => void
}

/** The DM's "↑", "↓" and "✎ Düzenle" of one set. */
function RowControls({ set, isFirst, isLast, isMoving, onMove, onEdit }: RowControlsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        aria-label={`${set.name}: yukarı taşı`}
        disabled={isFirst || isMoving}
        onClick={() => onMove('up')}
        className="size-9 px-0"
      >
        ↑
      </Button>
      <Button
        aria-label={`${set.name}: aşağı taşı`}
        disabled={isLast || isMoving}
        onClick={() => onMove('down')}
        className="size-9 px-0"
      >
        ↓
      </Button>
      <Button aria-label={`${set.name}: düzenle`} onClick={onEdit} className="h-9">
        ✎ Düzenle
      </Button>
    </div>
  )
}

/** The code and the aliases under a set's name. */
function codeLine(set: CardSet): string {
  return set.aliases.length === 0
    ? `code: ${set.code}`
    : `code: ${set.code} · alias: ${set.aliases.join(', ')}`
}

/**
 * Setler (spec: card-sets, "The Setler screen"): the stored sets live, in the shop order, each with its cardback, name,
 * code and aliases, pack layout and card count. The DM adds a set, moves one up or down, and edits one. A table on a
 * wide window, and a card per set at phone width.
 */
export function SetsPage() {
  const screen = screenById('sets')
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : ''
  const isDm = useIsDm()
  const sets = useSets()
  const index = useSetIndex()
  const actions = useSetActions()
  const isPhone = usePhoneWidth()
  const isOnline = useOnlineStatus()
  // The DM counts every card of the set, whatever its status; a player the cards they can see (design D9).
  const definitions = useDeckDefinitions('legend')
  const visible = useDeckCards('legend')
  const counts = useMemo(
    () => countBySet(isDm ? definitions : visible, index),
    [isDm, definitions, visible, index],
  )
  const [editing, setEditing] = useState<{ setId: string | null } | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [failure, setFailure] = useState<SetFailure | null>(null)

  const move = async (set: CardSet, neighbour: CardSet | undefined, direction: 'up' | 'down') => {
    if (neighbour === undefined) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setMovingId(set.id)
    try {
      await actions.moveSet({ set, neighbour, direction, by: uid })
    } catch (error) {
      setFailure(toSetFailure(error))
    } finally {
      setMovingId(null)
    }
  }

  const header = (
    <PageHeader
      title={screen.label}
      description="Shop, kart formu ve kütüphane bu sırayı kullanır."
      mascot={screen.mascot}
      actions={
        <DmOnly>
          <Button variant="primary" onClick={() => setEditing({ setId: null })}>
            + Set ekle
          </Button>
        </DmOnly>
      }
    />
  )

  if (sets.status !== 'ready') {
    return (
      <section className="flex flex-col gap-6">
        {header}
        {sets.status === 'loading' ? (
          <Spinner label="Setler yükleniyor" />
        ) : (
          <p role="alert" className="text-sm text-danger-ink">
            Setler yüklenemedi.
          </p>
        )}
      </section>
    )
  }

  const list = sets.data
  const rows = list.map((set, position) => ({
    set,
    number: position + 1,
    count: counts.get(set.id) ?? 0,
    controls: (
      <DmOnly>
        <RowControls
          set={set}
          isFirst={position === 0}
          isLast={position === list.length - 1}
          isMoving={movingId !== null}
          onMove={(direction) =>
            void move(set, list[direction === 'up' ? position - 1 : position + 1], direction)
          }
          onEdit={() => setEditing({ setId: set.id })}
        />
      </DmOnly>
    ),
  }))

  return (
    <section className="flex flex-col gap-6">
      {header}
      {failure ? (
        <p role="alert" className="text-sm text-danger-ink">
          {setFailureMessage(failure)}
        </p>
      ) : null}
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">Henüz set yok.</p>
      ) : isPhone ? (
        <ol aria-label="Setler" className="flex flex-col gap-3">
          {rows.map(({ set, number, count, controls }) => (
            <li
              key={set.id}
              className="flex flex-col gap-3 rounded-xl border border-line bg-pane p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-right text-sm text-ink-muted tabular-nums">{number}</span>
                <SetBack set={set} />
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="font-semibold break-words text-ink">{set.name}</span>
                  <span className="text-xs break-words text-ink-muted">{codeLine(set)}</span>
                  <span className="text-xs text-ink-muted">
                    {PACK_LAYOUT_LABELS[set.packLayout]}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gold">{count} kart</span>
              </div>
              {controls}
            </li>
          ))}
        </ol>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-pane">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead className="bg-pane-raised text-xs text-ink-muted uppercase">
              <tr>
                <th scope="col" className="w-10 px-4 py-3">
                  #
                </th>
                <th scope="col" className="w-14 px-2 py-3">
                  Back
                </th>
                <th scope="col" className="px-2 py-3">
                  Set
                </th>
                <th scope="col" className="px-2 py-3">
                  Paketler
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Kart
                </th>
                {isDm ? (
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">İşlemler</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ set, number, count, controls }) => (
                <tr key={set.id} className="border-t border-line align-middle">
                  <td className="px-4 py-2 text-ink-muted tabular-nums">{number}</td>
                  <td className="px-2 py-2">
                    <SetBack set={set} />
                  </td>
                  <th scope="row" className="px-2 py-2 font-normal">
                    <span className="block font-semibold text-ink">{set.name}</span>
                    <span className="block text-xs text-ink-muted">{codeLine(set)}</span>
                  </th>
                  <td className="px-2 py-2 text-ink-muted">{PACK_LAYOUT_LABELS[set.packLayout]}</td>
                  <td className={cn('px-2 py-2 text-right text-ink tabular-nums')}>{count}</td>
                  {isDm ? <td className="px-4 py-2">{controls}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing !== null ? (
        <SetFormDialog setId={editing.setId} cardCounts={counts} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  )
}

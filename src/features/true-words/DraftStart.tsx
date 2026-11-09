import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { genitive } from '@/lib/turkish'

import { learnableWords } from './api'
import { DraftConfirmDialog } from './DraftConfirmDialog'
import { draftPrice, type TrueWord, WORD_DRAFT_SIZE } from './schema'

export type DraftStartProps = {
  /** The player a draft would be for, live. */
  owner: UserProfile
  /** Every word. */
  words: readonly TrueWord[]
  /** The IDs of the words the player knows, retired ones included. */
  known: ReadonlySet<string>
  /** Whether the player has an open draft now. */
  hasOpenDraft: boolean
}

/**
 * The draft's price and the control that starts one: "✦ Draft Başlat". It is disabled, with the reason, while the
 * player has an open draft, has fewer than 3 learnable words left, cannot pay (a player starting their own), while a
 * pack is open, and offline.
 */
export function DraftStart({ owner, words, known, hasOpenDraft }: DraftStartProps) {
  const reasonId = useId()
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const [isConfirming, setIsConfirming] = useState(false)

  const name = profileName(owner)
  const price = draftPrice(known.size)
  const learnable = learnableWords(words, known).length
  const reason = hasOpenDraft
    ? `${genitive(name)} açık bir draft'ı var: aşağıdan devam et.`
    : learnable < WORD_DRAFT_SIZE
      ? 'Draft için en az 3 öğrenilmemiş True Word gerekli.'
      : !isDm && owner.lp < price
        ? `Draft ${formatAmount(price)} LP tutuyor; ${genitive(name)} ${formatAmount(owner.lp)} LP'si var.`
        : isTableBusy
          ? TABLE_BUSY_NOTE
          : !isOnline
            ? 'Bağlantı yok: draft için internet bağlantısı gerekiyor.'
            : null

  return (
    <section
      aria-label="Draft"
      className="flex flex-col gap-3 rounded-2xl border border-line bg-pane p-4"
    >
      <p className="text-sm text-ink-muted">
        {`${name} · ${known.size} True Word biliyor · ${learnable} öğrenilebilir True Word`}
      </p>
      <p className="text-sm text-ink">
        {'Draft fiyatı: '}
        <span className="font-semibold text-gold tabular-nums">{`${formatAmount(price)} LP`}</span>
        <span className="text-ink-muted"> (1 LP + bildiği her True Word için 1 LP)</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={reason !== null}
          aria-describedby={reason === null ? undefined : reasonId}
          onClick={() => setIsConfirming(true)}
        >
          ✦ Draft Başlat
        </Button>
        {reason === null ? null : (
          <p id={reasonId} className="text-sm text-ink-muted">
            {reason}
          </p>
        )}
      </div>
      {isConfirming ? (
        <DraftConfirmDialog
          owner={owner}
          price={price}
          words={words}
          known={known}
          onClose={() => setIsConfirming(false)}
        />
      ) : null}
    </section>
  )
}

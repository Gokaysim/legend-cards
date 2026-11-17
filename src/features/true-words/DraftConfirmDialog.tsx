import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { genitive } from '@/lib/turkish'

import { type WordFailure, wordFailureMessage, toWordFailure } from './errors'
import { DRAFT_COST_MAX, type TrueWord } from './schema'
import { useTrueWordActions } from './trueWordsContext'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type DraftConfirmDialogProps = {
  /** The player the draft is for, live. */
  owner: UserProfile
  /** The draft's price: 1 LP plus the words the player knows. */
  price: number
  /** Every word; the draft shows active ones the player does not know. */
  words: readonly TrueWord[]
  /** The IDs of the words the player knows. */
  known: ReadonlySet<string>
  onClose: () => void
}

/**
 * Confirms starting a True Word draft, with its payment. A player pays the price from their own LP and cannot start
 * one with less. The DM charges the player's LP, starting at the price, and may change the amount; 0 starts it for
 * free. On success the dialog closes: the open draft then shows on the screen and on the player's True Words tab.
 */
export function DraftConfirmDialog({
  owner,
  price,
  words,
  known,
  onClose,
}: DraftConfirmDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const actions = useTrueWordActions()
  const isOnline = useOnlineStatus()
  const isTableBusy = useIsTableBusy()

  // Every user's LP pays for a draft, a DM's included (spec: true-words, "The DM chooses the amount").
  const [amountText, setAmountText] = useState(String(price))
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<WordFailure | null>(null)

  const name = profileName(owner)
  const amount = isDm ? (amountText.trim() === '' ? Number.NaN : Number(amountText)) : price
  const isShort = Number.isInteger(amount) && amount > 0 && amount > owner.lp
  const canStart = uid !== null && !isBusy && !isTableBusy && (isDm || !isShort)

  const start = async () => {
    if (!canStart || uid === null) return
    setFailure(null)
    if (!Number.isInteger(amount) || amount < 0 || amount > DRAFT_COST_MAX) {
      setFailure({ kind: 'invalid-amount' })
      return
    }
    if (amount > owner.lp) {
      setFailure({ kind: 'insufficient', balance: owner.lp, amount })
      return
    }
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await actions.startDraft({
        uid: owner.id,
        by: uid,
        amount: isDm ? amount : 'price',
        words,
        known,
      })
      onClose()
    } catch (error) {
      setFailure(toWordFailure(error))
      setIsBusy(false)
    }
  }

  return (
    <Dialog title="✦ True Word Draft" onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-muted">Kimin için</dt>
        <dd className="text-ink">{name}</dd>
        <dt className="text-ink-muted">Fiyat</dt>
        <dd className="text-gold tabular-nums">{`${formatAmount(price)} LP`}</dd>
        <dt className="text-ink-muted">Bakiye</dt>
        <dd className="text-ink tabular-nums">{`${formatAmount(owner.lp)} LP`}</dd>
      </dl>
      <p className="text-sm text-ink-muted">
        3 rastgele True Word gösterilir: birini öğren ya da pas geç.
      </p>

      {isDm ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-ink">
            {`Tutar (${genitive(name)} LP'sinden)`}
          </label>
          <input
            id={`${ids}-amount`}
            type="number"
            inputMode="numeric"
            min={0}
            max={DRAFT_COST_MAX}
            step={1}
            data-autofocus
            aria-describedby={`${ids}-amount-note`}
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            className={fieldClasses}
          />
          <p id={`${ids}-amount-note`} className="text-xs text-ink-muted">
            0 = ücretsiz
          </p>
        </div>
      ) : isShort ? (
        <p className="text-sm text-ink-muted">{`${formatAmount(price)} LP gerekiyor.`}</p>
      ) : null}

      {isTableBusy ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {wordFailureMessage(failure, name)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!canStart} onClick={() => void start()}>
          {isBusy
            ? 'Başlatılıyor…'
            : isDm
              ? "Draft'ı başlat"
              : `Draft'ı başlat (${formatAmount(price)} LP)`}
        </Button>
      </div>
    </Dialog>
  )
}

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

import { useCustomDraftActions } from './customDraftContext'
import { type CustomCost, customCardName } from './draftRules'
import { type CustomDraftFailure, customDraftFailureMessage, toCustomDraftFailure } from './errors'
import { CUSTOM_DRAFT_COST_MAX } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type DraftAmountDialogProps = {
  /** The user the draft is for, live. */
  owner: UserProfile
  /** The draft's cost, which is also its price in LP. */
  base: CustomCost
  onClose: () => void
}

/**
 * Confirms starting a Custom Card draft, with its payment (spec: custom-cards, "Custom Card draft price" and "The DM
 * chooses the amount of a Custom Card draft"). A player pays the price from their own LP. The DM charges the user's
 * LP, starting at the price, and may change the amount from 0 up to that LP; 0 starts it for free. On success the dialog
 * closes, and the open draft shows on the screen.
 */
export function DraftAmountDialog({ owner, base, onClose }: DraftAmountDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const actions = useCustomDraftActions()
  const isOnline = useOnlineStatus()
  const isTableBusy = useIsTableBusy()

  const [amountText, setAmountText] = useState(String(base))
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<CustomDraftFailure | null>(null)

  const name = profileName(owner)
  const amount = isDm ? (amountText.trim() === '' ? Number.NaN : Number(amountText)) : base
  const canStart = uid !== null && !isBusy && !isTableBusy

  const start = async () => {
    if (!canStart || uid === null) return
    setFailure(null)
    if (!Number.isInteger(amount) || amount < 0 || amount > CUSTOM_DRAFT_COST_MAX) {
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
      await actions.start({ uid: owner.id, by: uid, base, amount: isDm ? amount : 'price' })
      onClose()
    } catch (error) {
      setFailure(toCustomDraftFailure(error))
      setIsBusy(false)
    }
  }

  return (
    <Dialog title={`✧ ${customCardName(base)}`} onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-muted">Kimin için</dt>
        <dd className="text-ink">{name}</dd>
        <dt className="text-ink-muted">Fiyat</dt>
        <dd className="text-gold tabular-nums">{`${formatAmount(base)} LP`}</dd>
        <dt className="text-ink-muted">Bakiye</dt>
        <dd className="text-ink tabular-nums">{`${formatAmount(owner.lp)} LP`}</dd>
      </dl>
      <p className="text-sm text-ink-muted">
        Her adımda en fazla 3 rastgele efekt gösterilir; kart tamamlanana kadar birini seç. Yeniden
        çekme ya da pas geçme yok.
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
            max={owner.lp}
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
      ) : null}

      {isTableBusy ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {customDraftFailureMessage(failure, name)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!canStart} onClick={() => void start()}>
          {isBusy
            ? 'Başlatılıyor…'
            : isDm
              ? "Draft'ı başlat"
              : `Draft'ı başlat (${formatAmount(base)} LP)`}
        </Button>
      </div>
    </Dialog>
  )
}

import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { pillClasses } from '@/features/cards/pillClasses'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { type BalanceAccount, isValidAmount } from './api'
import { useBalanceActions } from './balancesContext'
import {
  type BalanceFailure,
  balanceFailureMessage,
  type BalanceOwner,
  toBalanceFailure,
} from './errors'
import { formatAmount } from './format'
import { BALANCE_LIMITS } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/** The reason the spend dialog's shortcut fills in: the table rule "1 LP harcayarak bir d20 zarında avantaj alınır". */
export const D20_ADVANTAGE_REASON = 'd20 avantajı'

export type BalanceDialogProps = (
  | {
      currency: 'lp'
      /** The player. */
      uid: string
      /** The player's name. */
      name: string
      /** The player's own spend ("Legend Point harca"): it only subtracts, from 1 LP by default. */
      isSpend?: boolean
    }
  | { currency: 'gp' }
) & {
  /** The balance now, live. */
  balance: number
  onClose: () => void
}

/**
 * A change of a balance by hand. The DM changes a player's LP or the party purse: a whole amount and a reason, then
 * add or subtract. A player spends their own LP in the spend variant ("Legend Point harca", design D4 of
 * player-discard-and-spend): the amount starts at 1, a "d20 avantajı" shortcut fills the reason, the LP after the
 * change shows, and there is only "− Düş". Subtracting more than the balance is refused here and by the server. The
 * dialog closes once the change is made; the new balance shows live where the dialog was opened.
 */
export function BalanceDialog(props: BalanceDialogProps) {
  const { balance, onClose } = props
  const isSpend = props.currency === 'lp' && props.isSpend === true
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const actions = useBalanceActions()
  const isOnline = useOnlineStatus()

  const [amountText, setAmountText] = useState(isSpend ? '1' : '')
  const [reason, setReason] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<{ failure: BalanceFailure; amount: number } | null>(null)

  const account: BalanceAccount =
    props.currency === 'lp' ? { currency: 'lp', uid: props.uid } : { currency: 'gp' }
  const owner: BalanceOwner =
    props.currency === 'lp' ? { currency: 'lp', name: props.name } : { currency: 'gp' }
  const unit = props.currency === 'lp' ? 'LP' : 'GP'
  const title = isSpend
    ? 'Legend Point harca'
    : props.currency === 'lp'
      ? `Legend Point: ${props.name}`
      : 'Grup kesesi'

  const amount = amountText.trim() === '' ? Number.NaN : Number(amountText)
  const canSubmit = !isBusy && isValidAmount(amount) && reason.trim() !== '' && uid !== null
  const after = isValidAmount(amount) && amount <= balance ? balance - amount : null

  const change = async (sign: 1 | -1) => {
    if (!canSubmit || uid === null) return
    setFailure(null)
    if (sign === -1 && amount > balance) {
      setFailure({ failure: { kind: 'insufficient', balance }, amount })
      return
    }
    if (!isOnline) {
      setFailure({ failure: { kind: 'offline' }, amount })
      return
    }
    setIsBusy(true)
    try {
      await actions.changeBalance({ account, delta: sign * amount, reason, by: uid })
      onClose()
    } catch (error) {
      setFailure({ failure: toBalanceFailure(error), amount })
      setIsBusy(false)
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-sm text-ink-muted">
        Şu an:{' '}
        <span className="font-semibold text-ink tabular-nums">
          {formatAmount(balance)} {unit}
        </span>
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-ink">
          Miktar
        </label>
        <input
          id={`${ids}-amount`}
          type="number"
          inputMode="numeric"
          min={1}
          max={BALANCE_LIMITS.amount}
          step={1}
          data-autofocus
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          className={fieldClasses}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-reason`} className="text-sm font-medium text-ink">
          Neden
        </label>
        <input
          id={`${ids}-reason`}
          type="text"
          maxLength={BALANCE_LIMITS.reason}
          placeholder={isSpend ? 'Örn: d20 avantajı' : "Örn: Boss'u yendi"}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={fieldClasses}
        />
        {isSpend ? (
          <div className="pt-1">
            <button
              type="button"
              aria-pressed={reason === D20_ADVANTAGE_REASON}
              onClick={() => {
                setReason(D20_ADVANTAGE_REASON)
                setAmountText('1')
              }}
              className={pillClasses(reason === D20_ADVANTAGE_REASON)}
            >
              {D20_ADVANTAGE_REASON}
            </button>
          </div>
        ) : null}
      </div>
      {isSpend && after !== null ? (
        <p className="text-sm text-ink-muted">
          Sonra:{' '}
          <span className="font-semibold text-ink tabular-nums">{formatAmount(after)} LP</span>
        </p>
      ) : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {balanceFailureMessage(failure.failure, owner, failure.amount)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {isSpend ? null : (
          <Button variant="primary" disabled={!canSubmit} onClick={() => void change(1)}>
            + Ekle
          </Button>
        )}
        <Button
          variant={isSpend ? 'primary' : 'secondary'}
          disabled={!canSubmit}
          onClick={() => void change(-1)}
        >
          − Düş
        </Button>
      </div>
    </Dialog>
  )
}

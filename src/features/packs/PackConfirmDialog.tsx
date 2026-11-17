import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { usePartyPurse } from '@/features/balances/balancesContext'
import { formatAmount } from '@/features/balances/format'
import type { Card } from '@/features/cards/schema'
import { PACK_COST_MAX } from '@/features/draws/schema'
import { useSetIndex } from '@/features/sets/setsContext'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { PACK_PRICES, type PackDef, packTitle, priceLabel } from './catalog'
import { type PackCurrency, type PackFailure, packFailureMessage, toPackFailure } from './errors'
import { packLine } from './packLines'
import { usePackActions } from './packsContext'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

const UNIT: Record<PackCurrency, string> = { lp: 'LP', gp: 'GP' }

export type PackConfirmDialogProps = {
  def: PackDef
  /** The hand the pack is for, live. */
  owner: UserProfile
  /** The hands the DM can choose from in the dialog (design D12). A player's list is empty. */
  choices: readonly UserProfile[]
  /** Called with the uid of the hand the DM picks. */
  onOwnerChange: (uid: string) => void
  /** The live cards the pack is built from. */
  cards: readonly Card[]
  /** The name of the hand's owner of the pack that is open now, for the busy message. */
  openPackOwner: string | null
  onClose: () => void
}

/**
 * Confirms opening a pack, with its payment. A Mechanic Pack and the Golden Pack first say what they hold, in
 * v2.2.8's words. The DM picks the hand here, which resets the payment to that hand's defaults. A player pays the pack's LP price from their own LP and cannot open it
 * with less. The DM charges the player's LP or the party's GP, starting at the pack's price in that currency, and
 * may change the amount; 0 opens it for free. On success the dialog closes: the open pack then shows on every
 * screen.
 */
export function PackConfirmDialog({
  def,
  owner,
  choices,
  onOwnerChange,
  cards,
  openPackOwner,
  onClose,
}: PackConfirmDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const { setName } = useSetIndex()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const purse = usePartyPurse()
  const actions = usePackActions()
  const isOnline = useOnlineStatus()
  const isTableBusy = useIsTableBusy()

  const price = PACK_PRICES[def.type]
  const description = packLine(def)?.summary ?? null
  // Every hand's owner has LP, a DM included (spec: pack-shop, "The DM chooses the payment").
  const [currency, setCurrency] = useState<PackCurrency>('lp')
  const [amountText, setAmountText] = useState(String(price.lp))
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<PackFailure | null>(null)

  const effectiveCurrency: PackCurrency = isDm ? currency : 'lp'
  const amount = isDm ? (amountText.trim() === '' ? Number.NaN : Number(amountText)) : price.lp
  const purseGp = purse.status === 'ready' ? (purse.data?.gp ?? 0) : null
  const balance = effectiveCurrency === 'lp' ? owner.lp : purseGp
  const isShort = balance !== null && Number.isInteger(amount) && amount > balance
  const name = profileName(owner)

  const chooseCurrency = (next: PackCurrency) => {
    setCurrency(next)
    setAmountText(String(price[next]))
    setFailure(null)
  }

  const canChooseOwner = isDm && choices.length > 0
  const chooseOwner = (uid: string) => {
    const next = choices.find((profile) => profile.id === uid)
    if (next === undefined) return
    onOwnerChange(next.id)
    chooseCurrency(currency)
  }

  const canOpen = uid !== null && !isBusy && !isTableBusy && (isDm || !isShort)

  const open = async () => {
    if (!canOpen || uid === null) return
    setFailure(null)
    if (!Number.isInteger(amount) || amount < 0 || amount > PACK_COST_MAX) {
      setFailure({ kind: 'invalid-amount' })
      return
    }
    if (balance !== null && amount > balance) {
      setFailure({ kind: 'insufficient', currency: effectiveCurrency, balance, amount })
      return
    }
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await actions.openPack({
        def,
        uid: owner.id,
        by: uid,
        payment: { currency: effectiveCurrency, amount },
        cards,
      })
      onClose()
    } catch (error) {
      setFailure(toPackFailure(error))
      setIsBusy(false)
    }
  }

  return (
    <Dialog title={packTitle(def, setName)} onClose={onClose}>
      {/* What the pack holds, before paying, on every device (spec: pack-shop, design D10). */}
      {description === null ? null : (
        <p data-pack-description className="text-sm text-ink">
          {description}
        </p>
      )}
      {canChooseOwner ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-for`} className="text-sm font-medium text-ink">
            Kimin için
          </label>
          <select
            id={`${ids}-for`}
            value={owner.id}
            disabled={isBusy}
            onChange={(event) => chooseOwner(event.target.value)}
            className={fieldClasses}
          >
            {choices.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}
                {profile.role === 'dm' ? ' (DM)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {canChooseOwner ? null : (
          <>
            <dt className="text-ink-muted">Kimin için</dt>
            <dd className="text-ink">{name}</dd>
          </>
        )}
        <dt className="text-ink-muted">Fiyat</dt>
        <dd className="text-gold tabular-nums">{priceLabel(def.type)}</dd>
        {isDm ? null : (
          <>
            <dt className="text-ink-muted">Bakiye</dt>
            <dd className="text-ink tabular-nums">{formatAmount(owner.lp)} LP</dd>
          </>
        )}
      </dl>

      {isDm ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink">Ödeme</legend>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={`${ids}-currency`}
                checked={currency === 'lp'}
                onChange={() => chooseCurrency('lp')}
              />
              {`${genitive(name)} LP'si (${formatAmount(owner.lp)} LP)`}
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={`${ids}-currency`}
                checked={currency === 'gp'}
                onChange={() => chooseCurrency('gp')}
              />
              {`Grup kesesi (${purseGp === null ? '…' : formatAmount(purseGp)} GP)`}
            </label>
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-ink">
              {`Tutar (${UNIT[currency]})`}
            </label>
            <input
              id={`${ids}-amount`}
              type="number"
              inputMode="numeric"
              min={0}
              max={PACK_COST_MAX}
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
        </>
      ) : isShort ? (
        <p className="text-sm text-ink-muted">{`${formatAmount(price.lp)} LP gerekiyor.`}</p>
      ) : null}

      {isTableBusy ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {packFailureMessage(failure, { owner: name, openPackOwner })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!canOpen} onClick={() => void open()}>
          {isBusy ? 'Açılıyor…' : isDm ? "Pack'i aç" : `Pack'i aç (${formatAmount(price.lp)} LP)`}
        </Button>
      </div>
    </Dialog>
  )
}

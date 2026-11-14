import { useId } from 'react'

import { genitive } from '@/lib/turkish'

import { formatAmount } from './format'
import { type UsePayer, type UsePaymentPlan, shortfallNote } from './paymentPlan'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type UsePaymentProps = {
  /** From `planUsePayment`, with the same cost and payer. */
  plan: UsePaymentPlan
  /** Whose LP pays; `null` for someone without LP, the DM: then nothing shows. */
  payer: UsePayer | null
  /** The cost as written, shown for a price the user enters ("X"). */
  cost: string | null
  entered: string
  onEnteredChange: (value: string) => void
}

/**
 * The payment part of a use step, for a card and for a True Word (design D7 of `pay-lp-on-use`): the price, the
 * payer's LP before and after, the amount field when the price asks for one or the DM uses it, and a note when the
 * LP is too low. A player's own use of something free shows nothing, and neither does a use without LP.
 */
export function UsePayment({ plan, payer, cost, entered, onEnteredChange }: UsePaymentProps) {
  const ids = useId()
  if (payer === null) return null
  const { price, field, amount } = plan
  if (field === null && price.kind === 'fixed' && price.amount === 0) return null

  const priceText =
    price.kind === 'fixed'
      ? price.amount === 0
        ? 'Bedel yok'
        : `${formatAmount(price.amount)} LP`
      : price.kind === 'die'
        ? 'd6: masadaki zar'
        : `${cost?.trim() ?? ''}: sen belirle`
  // The LP after the use only while it can be paid: a balance never goes below 0.
  const lpText =
    amount !== null && amount > 0 && !plan.isShort
      ? `${formatAmount(payer.lp)} LP → ${formatAmount(payer.lp - amount)} LP`
      : `${formatAmount(payer.lp)} LP`
  const label =
    field === 'die'
      ? 'Zar sonucu (1–6)'
      : field === 'chosen'
        ? 'Kaç LP ödenecek?'
        : `Tutar (${genitive(payer.name)} LP'sinden)`

  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-muted">Bedel</dt>
        <dd className="text-gold tabular-nums">{priceText}</dd>
        <dt className="text-ink-muted">{payer.name}</dt>
        <dd className="text-ink tabular-nums">{lpText}</dd>
      </dl>
      {field === null ? null : (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-ink">
            {label}
          </label>
          <input
            id={`${ids}-amount`}
            type="number"
            inputMode="numeric"
            min={field === 'die' ? 1 : 0}
            max={field === 'die' ? 6 : undefined}
            step={1}
            aria-describedby={field === 'dm' ? `${ids}-amount-note` : undefined}
            value={entered}
            onChange={(event) => onEnteredChange(event.target.value)}
            className={fieldClasses}
          />
          {field === 'dm' ? (
            <p id={`${ids}-amount-note`} className="text-xs text-ink-muted">
              0 = ücretsiz
            </p>
          ) : null}
        </div>
      )}
      {plan.isShort && amount !== null ? (
        <p className="text-sm text-danger-ink">{shortfallNote(payer.name, payer.lp, amount)}</p>
      ) : null}
    </div>
  )
}

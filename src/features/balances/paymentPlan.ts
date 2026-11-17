import { DIE_SIDES, MAX_USE_AMOUNT, type UsePrice, priceOfUse } from '@/features/cards/display'
import { genitive } from '@/lib/turkish'

import { formatAmount } from './format'

/** The user whose LP pays for a use, live: the holder, a DM included. */
export type UsePayer = { name: string; lp: number }

export type UsePaymentInput = {
  /** The cost as written: a card's cost in this hand, or a True Word's cost. */
  cost: string | null
  /** Whose LP pays; `null` for a hand or word of someone without a profile. */
  payer: UsePayer | null
  /** True when the DM uses it: the DM chooses the amount. */
  isDm: boolean
  /** What the user typed in the amount field, when it shows. */
  entered: string
}

/** Which amount field the use step shows: a die, an amount the player chooses, or the DM's amount. */
export type AmountField = 'die' | 'chosen' | 'dm'

export type UsePaymentPlan = {
  price: UsePrice
  /** The amount field the step shows, or `null` for none. */
  field: AmountField | null
  /** The LP to pay, or `null` while the entered amount is not valid. */
  amount: number | null
  /** True when the payer's LP is below the amount. */
  isShort: boolean
  /** True when the use can be confirmed with this payment. */
  canConfirm: boolean
}

/**
 * What a use pays and asks for (spec: card-holdings, "The price of a use", "A player pays the price", "The DM chooses
 * the amount of a use"; true-words, "Using a True Word"):
 * - a player's own use pays a fixed price as it is, or the die or amount they enter
 * - the DM enters any whole amount from 0, which starts at the price (`initialEntered`)
 * - a hand or word of someone without a profile pays nothing and asks nothing
 *
 * The use cannot be confirmed while the amount is not valid or the payer's LP is below it.
 */
export function planUsePayment({ cost, payer, isDm, entered }: UsePaymentInput): UsePaymentPlan {
  const price = priceOfUse(cost)
  if (payer === null) return { price, field: null, amount: 0, isShort: false, canConfirm: true }
  let field: AmountField | null = null
  let amount: number | null
  if (isDm) {
    field = 'dm'
    amount = parseAmount(entered, 0, MAX_USE_AMOUNT)
  } else if (price.kind === 'fixed') {
    amount = price.amount
  } else if (price.kind === 'die') {
    field = 'die'
    amount = parseAmount(entered, 1, DIE_SIDES)
  } else {
    field = 'chosen'
    amount = parseAmount(entered, 0, MAX_USE_AMOUNT)
  }
  const isShort = amount !== null && amount > payer.lp
  return { price, field, amount, isShort, canConfirm: amount !== null && !isShort }
}

/** The amount field's first value: the DM starts at a fixed price; an amount to enter starts empty. */
export function initialEntered(cost: string | null, isDm: boolean): string {
  const price = priceOfUse(cost)
  return isDm && price.kind === 'fixed' ? String(price.amount) : ''
}

/** A whole number from `min` to `max` as typed, or `null`. */
function parseAmount(text: string, min: number, max: number): number | null {
  const value = text.trim()
  if (!/^\d+$/.test(value)) return null
  const amount = Number(value)
  return amount >= min && amount <= max ? amount : null
}

/** The confirm control of a use: "Kullanımı onayla (2 LP)", or without an amount for a free use. */
export function confirmUseLabel(amount: number | null): string {
  return amount !== null && amount > 0
    ? `Kullanımı onayla (${formatAmount(amount)} LP)`
    : 'Kullanımı onayla'
}

/** The note when a use costs more than the payer has: "Bu kullanım 3 LP tutuyor; Ayla'nın 1 LP'si var." */
export function shortfallNote(name: string | null, balance: number, amount: number): string {
  const owner = name === null ? 'oyuncunun' : genitive(name)
  return `Bu kullanım ${formatAmount(amount)} LP tutuyor; ${owner} ${formatAmount(balance)} LP'si var.`
}

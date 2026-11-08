const amountFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/** A balance or an amount with Turkish digit grouping: 12500 → "12.500". */
export function formatAmount(amount: number): string {
  return amountFormat.format(amount)
}

/** A change with its sign: 2 → "+2", -2500 → "−2.500" (with a real minus sign). */
export function formatDelta(delta: number): string {
  return `${delta < 0 ? '−' : '+'}${formatAmount(Math.abs(delta))}`
}

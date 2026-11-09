import { formatAmount } from '@/features/balances/format'
import { dative } from '@/lib/turkish'

import type { WordDraft } from './schema'

/** A word's cost as the interface shows it: "1 LP", "X LP". */
export function costLabel(cost: string): string {
  return `${cost} LP`
}

/** What a draft cost: "3 LP" or "ücretsiz". */
export function draftPaymentText(draft: Pick<WordDraft, 'paidWith' | 'cost'>): string {
  return draft.paidWith === 'none' ? 'ücretsiz' : `${formatAmount(draft.cost)} LP`
}

/** What a cancel gives back, for the DM's confirmation. */
export function draftRefundText(draft: Pick<WordDraft, 'paidWith' | 'cost'>, name: string): string {
  return draft.paidWith === 'none'
    ? 'Draft ücretsizdi; iade yok.'
    : `${dative(name)} ${formatAmount(draft.cost)} LP iade edilecek.`
}

/** What a skip keeps, for the confirmation. */
export function draftSkipText(draft: Pick<WordDraft, 'paidWith' | 'cost'>): string {
  return draft.paidWith === 'none'
    ? 'Hiçbir True Word öğrenilmez.'
    : `Ödenen ${formatAmount(draft.cost)} LP geri gelmez ve hiçbir True Word öğrenilmez.`
}

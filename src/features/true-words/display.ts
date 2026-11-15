import { formatAmount } from '@/features/balances/format'
import { dative } from '@/lib/turkish'

import { startingFlagsOf, type TrueWord } from '@/features/cards/schema'

import type { WordDraft } from './schema'

/**
 * A word that is not in the list this device reads (it should be): drawn from its ID and the name a record kept, with
 * an unknown cost, until the data says more.
 */
export function missingWord(id: string, name: string = id): TrueWord {
  return {
    id,
    kind: 'trueWord',
    name,
    nameKey: id,
    setCode: null,
    cost: '?',
    rarity: null,
    mechanicPack: null,
    text: '',
    status: 'retired',
    changeId: null,
    picture: null,
    holder: null,
    ...startingFlagsOf('trueWord', ''),
  }
}

/** A word's cost as the interface shows it: "1 LP", "X LP", or "—" for a draft without a cost. */
export function costLabel(cost: string | null): string {
  return cost === null ? '—' : `${cost} LP`
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

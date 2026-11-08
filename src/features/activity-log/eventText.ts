import { formatAmount, formatDelta } from '@/features/balances/format'
import type { Holding } from '@/features/hands/schema'
import { ablative, dative, genitive } from '@/lib/turkish'

import type { LogEvent } from './events'

/** A piece of a sentence: Turkish text, or a card name, which is English and shown as such. */
export type SentencePart = string | { card: string }

/** What an event says, after the name of the user who did it. A balance change also carries its reason. */
export type EventSentence = { parts: SentencePart[]; reason: string | null }

/** The name of the user with this uid, as the log shows it. */
export type NameOf = (uid: string) => string

/** The sentence as plain text. */
export function sentenceText(sentence: EventSentence): string {
  return sentence.parts.map((part) => (typeof part === 'string' ? part : part.card)).join('')
}

const card = (name: string): SentencePart => ({ card: name })

function usedSentence(event: LogEvent & { holding: Holding }, nameOf: NameOf): SentencePart[] {
  const { holding } = event
  const owner = event.by === holding.uid ? '' : `${genitive(nameOf(holding.uid))} `
  const where = holding.usedOn === null ? '' : ` ${holding.usedOn} üzerinde`
  return [owner, card(holding.cardName), ` kartını${where} kullandı.`]
}

/**
 * The Turkish sentence of an event. For a transfer with one side missing, `other` is that side once it is read;
 * until then the sentence leaves out the name it cannot know.
 */
export function describeEvent(
  event: LogEvent,
  nameOf: NameOf,
  other: Holding | null = null,
): EventSentence {
  switch (event.kind) {
    case 'given':
      return {
        parts: [
          card(event.holding.cardName),
          ` kartını ${dative(nameOf(event.holding.uid))} verdi.`,
        ],
        reason: null,
      }
    case 'used':
      return { parts: usedSentence(event, nameOf), reason: null }
    case 'discarded':
      return {
        parts: [
          `${genitive(nameOf(event.holding.uid))} elinden `,
          card(event.holding.cardName),
          ' kartını attı.',
        ],
        reason: null,
      }
    case 'transferred': {
      // The side that is missing from the records is `other`, once it is read.
      const fromUid = event.from?.uid ?? other?.uid ?? null
      const toUid = event.to?.uid ?? other?.uid ?? null
      const route = [
        fromUid === null ? null : ablative(nameOf(fromUid)),
        toUid === null ? null : dative(nameOf(toUid)),
      ]
        .filter((name) => name !== null)
        .join(' ')
      return {
        parts: [
          card(event.cardName),
          ` kartını${route === '' ? ' başka bir ele' : ` ${route}`} verdi.`,
        ],
        reason: null,
      }
    }
    case 'balance': {
      const { entry } = event
      const owner = entry.currency === 'gp' ? 'Grup kesesi' : nameOf(entry.account)
      const unit = entry.currency === 'gp' ? 'GP' : 'LP'
      const before = entry.balanceAfter - entry.delta
      return {
        parts: [
          `${owner}: ${formatDelta(entry.delta)} ${unit} (${formatAmount(before)} → ${formatAmount(entry.balanceAfter)})`,
        ],
        reason: entry.reason,
      }
    }
  }
}

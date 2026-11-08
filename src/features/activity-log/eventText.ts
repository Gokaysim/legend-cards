import { formatAmount, formatDelta } from '@/features/balances/format'
import type { DrawFilters } from '@/features/cards/pool'
import type { Draw } from '@/features/draws/schema'
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

const RARITY_LABELS = { common: 'Common', rare: 'Rare', blessed: 'Blessed' } as const

/** The DM's filters as the log shows them ("filtre: Rare · Blood & Battle"), or `null` without filters. */
function filtersText(filters: DrawFilters | null): string | null {
  if (filters === null) return null
  const parts = [
    filters.rarity === null ? null : RARITY_LABELS[filters.rarity],
    filters.mechanicPack,
    filters.cost === null ? null : `Cost ${filters.cost}`,
    filters.keyword === null ? null : `kelime “${filters.keyword}”`,
  ].filter((part) => part !== null)
  return parts.length === 0 ? null : `filtre: ${parts.join(' · ')}`
}

/**
 * A draw: "Aboleth's Eyes kartını çekti (−1 LP).", or into another hand (the DM's draw) "Bora'ya Aboleth's Eyes
 * kartını çekti (filtre: Rare · Blood & Battle)." A Cursed draw: "Cursed kart çekti: Visions of Death."
 */
function drawnSentence(draw: Draw, nameOf: NameOf): SentencePart[] {
  const into = draw.by === draw.uid ? '' : `${dative(nameOf(draw.uid))} `
  if (draw.kind === 'cursed') return [`${into}Cursed kart çekti: `, card(draw.cardName), '.']
  const details = [
    draw.paidWith === 'lp' ? `${formatDelta(-draw.cost)} LP` : null,
    filtersText(draw.filters),
  ].filter((part) => part !== null)
  const suffix = details.length === 0 ? '' : ` (${details.join('; ')})`
  return [into, card(draw.cardName), ` kartını çekti${suffix}.`]
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
    case 'drawn':
      return { parts: drawnSentence(event.draw, nameOf), reason: null }
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

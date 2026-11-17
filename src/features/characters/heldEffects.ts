import { visibleText } from '@/features/cards/text'

// The effects a player's hand puts on every one of their characters (design D6 of add-character-effects; spec:
// character-effects, "Held effects on every character"). They are derived, never stored: the hand screen passes the
// hand's cards and known words in, so this feature reads no holdings or words of its own.

/** A card in the hand, as far as its effect needs it. */
export type HeldCardLike = {
  holding: { id: string; active: boolean }
  card: { name: string; text: string; kind: string }
}

/** A known True Word, as far as its effect needs it. */
export type KnownWordLike = {
  record: { id: string; active: boolean }
  word: { name: string; text: string }
}

/** An effect from the hand: an active card ("Elden") or an active True Word ("True Word"). */
export type HeldEffect = {
  /** The holding's or the word record's ID, unique among them. */
  id: string
  kind: 'held' | 'word'
  name: string
  text: string
  cursed: boolean
  blessed: boolean
}

/** The hand's active cards in the hand's order, then its active words in the order learned. */
export function heldEffects(
  cards: readonly HeldCardLike[],
  words: readonly KnownWordLike[],
): HeldEffect[] {
  return [
    ...cards
      .filter((entry) => entry.holding.active)
      .map((entry) => ({
        id: entry.holding.id,
        kind: 'held' as const,
        name: entry.card.name,
        text: visibleText(entry.card.text),
        cursed: entry.card.kind === 'cursed',
        blessed: entry.card.kind === 'blessed',
      })),
    ...words
      .filter((entry) => entry.record.active)
      .map((entry) => ({
        id: entry.record.id,
        kind: 'word' as const,
        name: entry.word.name,
        text: visibleText(entry.word.text),
        cursed: false,
        blessed: false,
      })),
  ]
}

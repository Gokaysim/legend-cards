import type { CharacterEffect, EffectSource } from './effects'
import type { HeldEffect } from './heldEffects'

/**
 * An effect's kind, which decides its color (spec: visual-effects, "Effect colors"; design D5 of
 * redesign-hand-dashboard): a Cursed card's, a Blessed card's, a True Word's, any other card's, or one written by hand
 * (an own or a DM effect).
 */
export type EffectKind = 'cursed' | 'blessed' | 'word' | 'card' | 'custom'

/** Cursed wins, then Blessed, then the source: a word, a card, or an effect written by hand. */
export function effectKind(effect: {
  source: EffectSource
  cursed: boolean
  blessed: boolean
}): EffectKind {
  if (effect.cursed) return 'cursed'
  if (effect.blessed) return 'blessed'
  if (effect.source === 'word') return 'word'
  if (effect.source === 'card') return 'card'
  return 'custom'
}

/** Each stored source's mark. */
const SOURCE_MARKS: Record<EffectSource, string> = {
  card: 'Kart',
  word: 'True Word',
  own: 'Özel',
  dm: 'DM',
}

/** One effect of a character, held or stored, as its lists show it. */
export type EffectRow = {
  key: string
  /** "Elden", "True Word", "Kart", "Özel" or "DM". */
  mark: string
  kind: EffectKind
  name: string
  /** Card and word names are English, as the cards are. */
  isEnglish: boolean
  text: string
  /** The stored effect, or `null` for one from the hand. */
  stored: CharacterEffect | null
}

/**
 * A character's effects in the order of its "Aktif efektler" (spec: character-effects, "Active effects in the
 * details"): the held cards, then the active True Words, both from the owner's hand, then the stored effects, newest
 * first, as `effects` comes.
 */
export function effectRows(
  held: readonly HeldEffect[],
  effects: readonly CharacterEffect[],
): EffectRow[] {
  return [
    ...held.map((effect) => ({
      key: `held-${effect.id}`,
      mark: effect.kind === 'held' ? 'Elden' : 'True Word',
      kind: effectKind({
        source: effect.kind === 'held' ? 'card' : 'word',
        cursed: effect.cursed,
        blessed: effect.blessed,
      }),
      name: effect.name,
      isEnglish: true,
      text: effect.text,
      stored: null,
    })),
    ...effects.map((effect) => ({
      key: effect.id,
      mark: SOURCE_MARKS[effect.source],
      kind: effectKind(effect),
      name: effect.name,
      isEnglish: effect.source === 'card' || effect.source === 'word',
      text: effect.text,
      stored: effect,
    })),
  ]
}

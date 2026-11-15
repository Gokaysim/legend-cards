/**
 * Fixed card vocabulary: the name normalization, the mechanic packs the card import checks against, and the behavior
 * flags a new definition starts with. The sets are stored data (`sets/{setId}`, design D1 of add-set-management), which
 * the scripts read from Firestore.
 *
 * Scripts do not import app code, so the mechanic packs, `normalize` and `startingFlags` are kept in step by hand with
 * `src/features/cards/mechanicPacks.ts`, `src/features/cards/text.ts` and `src/features/definitions/flags.ts`.
 * `cardCatalog.drift.test.ts` fails if they differ.
 */

/** Letters that NFKD does not split into a base letter plus a mark. The legacy app's `norm` table. */
const SPECIAL_LETTERS: Readonly<Record<string, string>> = {
  þ: 'th',
  ð: 'd',
  đ: 'd',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  ħ: 'h',
  ı: 'i',
  ß: 'ss',
  ŋ: 'n',
  ĸ: 'k',
  ŧ: 't',
}
const SPECIAL_LETTER_PATTERN = /[þðđæœøłħıßŋĸŧ]/g

/**
 * The legacy normalization (`norm`): lowercase, special letters spelled out, accents removed, and everything
 * outside `[a-z0-9]` dropped. Card names are matched by it, so "Aboleth's Eyes" and "aboleths eyes" are one card.
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(SPECIAL_LETTER_PATTERN, (letter) => SPECIAL_LETTERS[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** The eight mechanic packs (docs/domain.md, Mechanic Packs). */
export const MECHANIC_PACKS: readonly string[] = [
  'Arcanus Divine',
  'Blood & Battle',
  "Dungeoneer's Kit",
  "Gambler's Gambit",
  'Horn of Plenty',
  'Legends of Old',
  'Permamancy',
  'Risk & Reward',
]

const knownMechanicKeys = new Set(MECHANIC_PACKS.map(normalize))

/** True when the mechanic pack is one of the eight. Case, accents, spaces and punctuation are ignored. */
export function isKnownMechanicPack(name: string): boolean {
  return knownMechanicKeys.has(normalize(name))
}

/** Every kind of definition in `cards/{cardId}`. Keep in step with `src/features/definitions/flags.ts`. */
export type DefinitionKind = 'normal' | 'blessed' | 'cursed' | 'trueWord'

/** The eight behavior flags (design D2 of unify-cards-and-true-words). */
export type BehaviorFlags = {
  isInLibrary: boolean
  isInDraws: boolean
  isInSetPacks: boolean
  isInMechanicPacks: boolean
  isRepeatable: boolean
  hasHeldEffect: boolean
  hasUseEffect: boolean
  isKeptOnUse: boolean
}

/** True for a text that starts with "Held:", in any case, after any leading `[bracket]` metadata. */
export function isHeldText(text: string): boolean {
  return /^\s*(?:\[[^\]]*\]\s*)*held\s*:/i.test(text)
}

/**
 * The flags a definition the import adds starts with: its kind's current behavior (spec: definition-editing, "Starting
 * values of the flags"). A Cursed card and a True Word are in no pack's own cards; a True Word is kept on use; only a
 * normal card has one copy; a "Held:" text acts while held.
 */
export function startingFlags(kind: DefinitionKind, text: string): BehaviorFlags {
  const outOfPacks = kind === 'cursed' || kind === 'trueWord'
  return {
    isInLibrary: true,
    isInDraws: true,
    isInSetPacks: !outOfPacks,
    isInMechanicPacks: !outOfPacks,
    isRepeatable: kind !== 'normal',
    hasHeldEffect: isHeldText(text),
    hasUseEffect: true,
    isKeptOnUse: kind === 'trueWord',
  }
}

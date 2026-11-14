/**
 * Fixed card vocabulary: the name normalization, and the mechanic packs the card import checks against. The sets are
 * stored data (`sets/{setId}`, design D1 of add-set-management), which the scripts read from Firestore.
 *
 * Scripts do not import app code, so the mechanic packs and `normalize` are kept in step by hand with
 * `src/features/cards/mechanicPacks.ts` and `src/features/cards/text.ts`. `cardCatalog.drift.test.ts` fails if they
 * differ.
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

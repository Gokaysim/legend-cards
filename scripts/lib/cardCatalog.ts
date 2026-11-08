/**
 * Fixed card vocabulary the import checks against: the official sets and the mechanic packs.
 *
 * Scripts do not import app code, so the sets and `normalize` are kept in step by hand with
 * `src/features/cards/sets.ts` and `src/features/cards/text.ts`. `cardCatalog.drift.test.ts` fails if they differ.
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

export type OfficialSet = {
  /** The set code as the card data writes it. */
  code: string
  /** The official name the interface shows. */
  name: string
  /** Other spellings that also mean this set. */
  aliases: readonly string[]
}

/** The official sets, in shop order (docs/domain.md, Sets). A fixed list: never derive set names from data. */
export const OFFICIAL_SETS: readonly OfficialSet[] = [
  { code: 'The End is Nigh', name: 'The End is Nigh', aliases: ['endisnigh'] },
  { code: 'Pentagon', name: 'Conclave at Pentagon', aliases: [] },
  { code: 'Rhodelen', name: 'Rituals in Rhodelen', aliases: [] },
  { code: 'Ashavir', name: 'The Overlord of Ashavir', aliases: [] },
  { code: 'Kesqer', name: 'Kesqerian Nights', aliases: [] },
  { code: 'Godtower', name: 'The Godtower', aliases: [] },
  { code: 'Davarron', name: 'Descent Under Davarron', aliases: [] },
  { code: 'Havenholm', name: 'Throne of Havenholm', aliases: [] },
  { code: 'Ulagal', name: 'Ballad of Ulagal', aliases: [] },
  { code: 'Nordhallr', name: 'Ragnarök: Nordhallr', aliases: ['ragnarok', 'ragnarök'] },
  { code: 'Gurgitea', name: 'The Lost City of Gurgitea', aliases: [] },
  { code: 'Pandemonium', name: 'Pandemonium', aliases: [] },
]

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

const knownSetKeys = new Set(
  OFFICIAL_SETS.flatMap((set) => [set.code, ...set.aliases].map(normalize)),
)
const knownMechanicKeys = new Set(MECHANIC_PACKS.map(normalize))

/** True when the set code, or one of its aliases, is in the official list. Case, accents and spaces are ignored. */
export function isKnownSetCode(code: string): boolean {
  return knownSetKeys.has(normalize(code))
}

/** True when the mechanic pack is one of the eight. Case, accents, spaces and punctuation are ignored. */
export function isKnownMechanicPack(name: string): boolean {
  return knownMechanicKeys.has(normalize(name))
}

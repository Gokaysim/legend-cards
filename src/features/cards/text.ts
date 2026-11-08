// Pure text helpers for card names and texts. This module has no imports on purpose: the script tests
// (Node type config, no `@/` alias) import it to check that it agrees with `scripts/lib/cardCatalog.ts`.

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
 * outside `[a-z0-9]` dropped. Search and set names compare through it. Keep in step with
 * `scripts/lib/cardCatalog.ts` (the drift test checks it).
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(SPECIAL_LETTER_PATTERN, (letter) => SPECIAL_LETTERS[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * A card text as players see it: `[bracket]` metadata removed and the spaces it leaves tidied, as the legacy
 * `visibleText` did. The metadata stays searchable through the raw text.
 */
export function visibleText(text: string): string {
  return text
    .replace(/\[[^\]\r\n]*\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim()
}

/** The terms of a search: split at commas and semicolons, normalized, empty ones dropped. */
export function searchTerms(query: string): string[] {
  return query
    .split(/[,;]/)
    .map(normalize)
    .filter((term) => term !== '')
}

/** True when every term occurs in the normalized haystack. No terms match everything. */
export function matchesAllTerms(normalizedHaystack: string, terms: readonly string[]): boolean {
  return terms.every((term) => normalizedHaystack.includes(term))
}

const VOWELS = /[aeıioöuü]/g
const GENITIVE_SUFFIX: Record<string, string> = {
  a: 'ın',
  ı: 'ın',
  e: 'in',
  i: 'in',
  o: 'un',
  u: 'un',
  ö: 'ün',
  ü: 'ün',
}

/**
 * A name in the genitive ("whose"), written with an apostrophe as Turkish does for proper names, following
 * vowel harmony: "Ayla'nın", "Cem'in", "Gökay'ın", "Umut'un", "Türkü'nün". A name without a Turkish vowel
 * takes "'ın".
 */
export function genitive(name: string): string {
  const lower = name.trim().toLocaleLowerCase('tr')
  const lastVowel = lower.match(VOWELS)?.at(-1) ?? 'a'
  const buffer = /[aeıioöuü]$/.test(lower) ? 'n' : ''
  return `${name.trim()}'${buffer}${GENITIVE_SUFFIX[lastVowel] ?? 'ın'}`
}

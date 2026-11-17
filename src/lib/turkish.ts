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

/** The name in lower case, and whether its last Turkish vowel is a front vowel (e, i, ö, ü). */
function harmony(name: string): { lower: string; front: boolean } {
  const lower = name.trim().toLocaleLowerCase('tr')
  const lastVowel = lower.match(VOWELS)?.at(-1) ?? 'a'
  return { lower, front: 'eiöü'.includes(lastVowel) }
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

/**
 * A name in the dative ("to whom"), with an apostrophe and vowel harmony: "Ayla'ya", "Cem'e", "Gökay'a",
 * "Türkü'ye". A name without a Turkish vowel takes "'a".
 */
export function dative(name: string): string {
  const { lower, front } = harmony(name)
  const buffer = /[aeıioöuü]$/.test(lower) ? 'y' : ''
  return `${name.trim()}'${buffer}${front ? 'e' : 'a'}`
}

/**
 * A name in the ablative ("from whom"), with an apostrophe and vowel harmony. After a voiceless consonant the
 * suffix hardens: "Ayla'dan", "Cem'den", "Umut'tan", "Ahmet'ten". A name without a Turkish vowel takes "'dan".
 */
export function ablative(name: string): string {
  const { lower, front } = harmony(name)
  const hard = /[fstkçşhp]$/.test(lower)
  return `${name.trim()}'${hard ? 't' : 'd'}${front ? 'en' : 'an'}`
}

/** The four-way vowel of the accusative, as of the genitive: the last vowel picks ı, i, u or ü. */
const ACCUSATIVE_SUFFIX: Record<string, string> = {
  a: 'ı',
  ı: 'ı',
  e: 'i',
  i: 'i',
  o: 'u',
  u: 'u',
  ö: 'ü',
  ü: 'ü',
}

/**
 * A name in the accusative ("whom"), with an apostrophe and four-way vowel harmony: "Ayla'yı", "Cem'i",
 * "Gökay'ı", "Umut'u", "Türkü'yü". A name without a Turkish vowel takes "'ı".
 */
export function accusative(name: string): string {
  const lower = name.trim().toLocaleLowerCase('tr')
  const lastVowel = lower.match(VOWELS)?.at(-1) ?? 'a'
  const buffer = /[aeıioöuü]$/.test(lower) ? 'y' : ''
  return `${name.trim()}'${buffer}${ACCUSATIVE_SUFFIX[lastVowel] ?? 'ı'}`
}

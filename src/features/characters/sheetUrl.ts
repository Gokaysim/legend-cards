import { CHARACTER_LIMITS } from './schema'

/** What a typed sheet link reads as (design D3 of add-character-sheet-link). */
export type SheetUrlReading =
  /** An empty or blank field: no link. */
  | { kind: 'none' }
  /** A web address, as it is stored. */
  | { kind: 'link'; url: string }
  /** An address with a start other than `http://` or `https://`, such as `javascript:`. */
  | { kind: 'wrong-start' }
  /** Text that is not a web address, or one longer than the limit. */
  | { kind: 'invalid' }

const WEB_START = /^https?:\/\//i

/**
 * Another scheme: letters, then a colon that is not followed by a digit. The digit keeps `localhost:5173/x` and
 * `example.com:8080` as addresses without their start.
 */
const OTHER_START = /^[a-z][a-z\d+.-]*:(?!\d)/i

/**
 * Reads a typed sheet link (spec: characters, "The sheet link in the form"). A link without its start gets
 * `https://` in front. The result is the parsed address, with its scheme and host in lower case and spaces
 * percent-encoded, so it always passes the stored check (`characterSchema`, `validCharacter` in `firestore.rules`).
 */
export function readSheetUrl(text: string): SheetUrlReading {
  const trimmed = text.trim()
  if (trimmed === '') return { kind: 'none' }
  if (!WEB_START.test(trimmed) && OTHER_START.test(trimmed)) return { kind: 'wrong-start' }
  const candidate = WEB_START.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return { kind: 'invalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'wrong-start' }
  if (url.hostname === '' || url.href.length > CHARACTER_LIMITS.sheetUrl) return { kind: 'invalid' }
  return { kind: 'link', url: url.href }
}

/**
 * The name of a sheet link's site for the character's view: its host without a leading `www.`, or `null` when the
 * stored address cannot be read. A host in another alphabet stays in its ASCII (punycode) form.
 */
export function sheetSiteName(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

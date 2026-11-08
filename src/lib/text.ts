/**
 * Trims a typed value and cuts it to `max` characters. A blank value becomes `null`. Cuts by code points, so an
 * emoji at the limit is never split in half.
 */
export function cleanText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : Array.from(trimmed).slice(0, max).join('')
}

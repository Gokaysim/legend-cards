import { parse } from 'csv-parse/sync'

// CSV reading shared by the card and True Words imports. Pure: no files, no Firebase.

/** Header names compared loosely, as the legacy import did: "Mechanic_Pack" and "mechanic pack" are the same. */
export const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')

/** Every record of a CSV text, the header included, or the parser's error. A BOM is ignored. */
export function readRecords(text: string): string[][] | { error: string } {
  try {
    return parse(text, { bom: true, relax_column_count: true, skip_empty_lines: false })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

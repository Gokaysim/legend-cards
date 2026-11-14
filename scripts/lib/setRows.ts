import { normalize } from './cardCatalog.ts'
import { normalizeHeader, readRecords } from './csv.ts'

// Reading and checking the set file, `data/sets.csv` (spec: admin-scripts, "Importing sets from a CSV file", "The set
// file is validated before writing"). Pure: no files, no Firebase.

/** A set's pack layout (design D1 of add-set-management). Keep in step with `src/features/sets/schema.ts`. */
export const PACK_LAYOUTS = ['standard', 'pandemonium'] as const
export type PackLayout = (typeof PACK_LAYOUTS)[number]

/** Field limits. Keep in step with `src/features/sets/schema.ts` and `firestore.rules`. */
export const SET_LIMITS = {
  /** The length of the code, the name and each alias. */
  text: 100,
  aliases: 10,
} as const

/** The columns the file must have, by their normalized header names. */
export const SET_COLUMNS: readonly string[] = ['code', 'name', 'aliases', 'packs']

/** A set as one row of the file gives it, values trimmed and empty aliases dropped. */
export type SetRow = {
  /** The spreadsheet row number: the header is row 1. */
  row: number
  code: string
  name: string
  aliases: string[]
  packLayout: PackLayout
}

/** A field whose length is limited. */
export type SetTextField = 'code' | 'name' | 'alias'

/** A problem that stops the set import. `row` is the spreadsheet row number: the header is row 1. */
export type SetFileError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'empty-cell'; row: number; column: 'Code' | 'Name' }
  | { kind: 'without-letters'; row: number; field: 'code' | 'alias'; value: string }
  | { kind: 'too-long'; row: number; field: SetTextField; value: string; max: number }
  | { kind: 'too-many-aliases'; row: number; count: number; max: number }
  | { kind: 'unknown-packs'; row: number; value: string }
  | { kind: 'blessed-code'; row: number }
  | { kind: 'duplicate'; rows: [number, number]; field: 'name' | 'spelling'; value: string }

export type ParsedSetFile = { sets: SetRow[]; errors: SetFileError[] }

const isPackLayout = (value: string): value is PackLayout =>
  (PACK_LAYOUTS as readonly string[]).includes(value)

/**
 * Reads the set file and checks every row. Returns the sets in the file's order and every problem found; the caller
 * writes nothing if there is an error. Names are unique among the names, and the spellings (codes and aliases) among
 * the spellings, compared with `normalize`. A row may spell one set twice, as "ragnarok, ragnarök" does.
 */
export function parseSetFile(text: string): ParsedSetFile {
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { sets: [], errors: [{ kind: 'unreadable', detail: records.error }] }
  }
  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = SET_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length > 0)
    return { sets: [], errors: [{ kind: 'missing-columns', columns: missing }] }
  const column = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const sets: SetRow[] = []
  const errors: SetFileError[] = []
  const firstRowByName = new Map<string, number>()
  const firstRowBySpelling = new Map<string, number>()

  rows.forEach((record, position) => {
    const row = position + 2
    if (record.every((cell) => cell.trim() === '')) return
    const code = column(record, 'code')
    const name = column(record, 'name')
    const aliases = column(record, 'aliases')
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias !== '')
    const packs = column(record, 'packs')

    const rowErrors: SetFileError[] = []
    if (code === '') rowErrors.push({ kind: 'empty-cell', row, column: 'Code' })
    if (name === '') rowErrors.push({ kind: 'empty-cell', row, column: 'Name' })
    if (code !== '' && normalize(code) === '') {
      rowErrors.push({ kind: 'without-letters', row, field: 'code', value: code })
    }
    if (normalize(code) === 'blessed') rowErrors.push({ kind: 'blessed-code', row })
    for (const [field, value] of [
      ['code', code],
      ['name', name],
      ...aliases.map((alias) => ['alias', alias] as const),
    ] as const) {
      if (value.length > SET_LIMITS.text) {
        rowErrors.push({ kind: 'too-long', row, field, value, max: SET_LIMITS.text })
      }
    }
    for (const alias of aliases) {
      if (normalize(alias) === '') {
        rowErrors.push({ kind: 'without-letters', row, field: 'alias', value: alias })
      }
    }
    if (aliases.length > SET_LIMITS.aliases) {
      rowErrors.push({
        kind: 'too-many-aliases',
        row,
        count: aliases.length,
        max: SET_LIMITS.aliases,
      })
    }
    const packLayout = packs.toLowerCase()
    if (!isPackLayout(packLayout)) rowErrors.push({ kind: 'unknown-packs', row, value: packs })

    // Each name and spelling once per row: a row may spell its own set twice.
    const claim = (
      firstRows: Map<string, number>,
      field: 'name' | 'spelling',
      values: readonly string[],
    ) => {
      const seen = new Set<string>()
      for (const value of values) {
        const key = normalize(value)
        if (key === '' || seen.has(key)) continue
        seen.add(key)
        const firstRow = firstRows.get(key)
        if (firstRow === undefined) firstRows.set(key, row)
        else rowErrors.push({ kind: 'duplicate', rows: [firstRow, row], field, value })
      }
    }
    claim(firstRowByName, 'name', [name])
    claim(firstRowBySpelling, 'spelling', [code, ...aliases])

    if (rowErrors.length > 0 || !isPackLayout(packLayout)) {
      errors.push(...rowErrors)
      return
    }
    sets.push({ row, code, name, aliases, packLayout })
  })
  return { sets, errors }
}

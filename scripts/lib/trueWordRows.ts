import { normalize } from './cardCatalog.ts'
import { normalizeHeader, readRecords } from './csv.ts'

/** A True Word as the import stores it (design D1). Keep in step with `src/features/true-words/schema.ts`. */
export type TrueWordDefinition = {
  name: string
  nameKey: string
  /** As written, for example "1", "0" or "X": the LP a player pays at the table each time they use the word. */
  cost: string
  text: string
}

/** Field limits. Keep in step with `src/features/true-words/schema.ts`. */
export const WORD_LIMITS = {
  name: 200,
  cost: 10,
  text: 2000,
} as const
export type WordLimitedField = keyof typeof WORD_LIMITS

/** The columns the file must have, by their normalized header names. */
export const WORD_COLUMNS: readonly string[] = ['name', 'cost', 'text']

/** A problem that stops the import. `row` is the spreadsheet row number: the header is row 1. */
export type TrueWordFileError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'empty-name'; row: number }
  | { kind: 'name-without-letters'; row: number; name: string }
  | { kind: 'empty-cost'; row: number; name: string }
  | { kind: 'too-long'; row: number; name: string; field: WordLimitedField; max: number }
  | { kind: 'duplicate'; rows: [number, number]; name: string }

/** A finding that does not stop the import. */
export type TrueWordFileWarning = { kind: 'empty-text'; row: number; name: string }

export type ParsedTrueWord = { row: number; word: TrueWordDefinition }

export type ParsedTrueWordFile = {
  words: ParsedTrueWord[]
  errors: TrueWordFileError[]
  warnings: TrueWordFileWarning[]
}

/** How the data writes "nothing here": an empty cell or a dash. */
const isBlank = (value: string) => value === '' || /^[—–-]$/.test(value)

/**
 * Reads the True Words file and checks every row (spec: admin-scripts, "True Word file is validated before
 * writing"). Returns all words, errors and warnings; the caller writes nothing if there is an error.
 * Pure: no files, no Firebase.
 */
export function parseTrueWordFile(text: string): ParsedTrueWordFile {
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { words: [], errors: [{ kind: 'unreadable', detail: records.error }], warnings: [] }
  }

  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = WORD_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length > 0) {
    return { words: [], errors: [{ kind: 'missing-columns', columns: missing }], warnings: [] }
  }
  const column = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const words: ParsedTrueWord[] = []
  const errors: TrueWordFileError[] = []
  const warnings: TrueWordFileWarning[] = []
  const firstRowByKey = new Map<string, number>()

  rows.forEach((record, index) => {
    const row = index + 2
    if (record.every((cell) => cell.trim() === '')) return

    const name = column(record, 'name')
    if (name === '') {
      errors.push({ kind: 'empty-name', row })
      return
    }
    const nameKey = normalize(name)
    if (nameKey === '') {
      errors.push({ kind: 'name-without-letters', row, name })
      return
    }

    const rowErrors: TrueWordFileError[] = []
    const limited = (field: WordLimitedField, value: string) => {
      if (value.length > WORD_LIMITS[field]) {
        rowErrors.push({ kind: 'too-long', row, name, field, max: WORD_LIMITS[field] })
      }
      return value
    }

    limited('name', name)
    const cost = column(record, 'cost')
    if (isBlank(cost)) rowErrors.push({ kind: 'empty-cost', row, name })
    else limited('cost', cost)
    const wordText = limited('text', column(record, 'text'))

    const firstRow = firstRowByKey.get(nameKey)
    if (firstRow !== undefined) {
      rowErrors.push({ kind: 'duplicate', rows: [firstRow, row], name })
    } else {
      firstRowByKey.set(nameKey, row)
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }
    if (wordText === '') warnings.push({ kind: 'empty-text', row, name })
    words.push({ row, word: { name, nameKey, cost, text: wordText } })
  })

  return { words, errors, warnings }
}

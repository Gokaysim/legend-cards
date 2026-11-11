import { normalize } from './cardCatalog.ts'
import { normalizeHeader, readRecords } from './csv.ts'

/** A True Word as the import stores it (design D1). Keep in step with `src/features/true-words/schema.ts`. */
export type TrueWordDefinition = {
  name: string
  nameKey: string
  /**
   * As written, for example "1", "0" or "X": the LP a player pays at the table each time they use the word. `null`
   * when the file leaves it empty, which makes the word a draft.
   */
  cost: string | null
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
  | { kind: 'too-long'; row: number; name: string; field: WordLimitedField; max: number }
  | { kind: 'duplicate'; rows: [number, number]; name: string }

/** A column a word uses. Keep in step with `missingWordFields` in `src/features/true-words/schema.ts`. */
export type WordColumn = 'cost' | 'text'

/**
 * One word read from the file, with the columns it leaves empty. A word without any is added as active, and one with
 * some as a draft.
 */
export type ParsedTrueWord = { row: number; word: TrueWordDefinition; missing: WordColumn[] }

export type ParsedTrueWordFile = {
  words: ParsedTrueWord[]
  errors: TrueWordFileError[]
}

/** An empty cell or a dash: in the True Words file a dash counts as empty, even in the Cost column. */
const isBlank = (value: string) => value === '' || /^[—–-]$/.test(value)

/**
 * Reads the True Words file and checks every row (spec: admin-scripts, "True Word file is validated before
 * writing"). Returns all words with their missing columns, and the errors; the caller writes nothing if there is an
 * error. An empty cost or text is not an error: it makes the word a draft.
 * Pure: no files, no Firebase.
 */
export function parseTrueWordFile(text: string): ParsedTrueWordFile {
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { words: [], errors: [{ kind: 'unreadable', detail: records.error }] }
  }

  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = WORD_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length > 0) {
    return { words: [], errors: [{ kind: 'missing-columns', columns: missing }] }
  }
  const column = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const words: ParsedTrueWord[] = []
  const errors: TrueWordFileError[] = []
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
    const costCell = limited('cost', column(record, 'cost'))
    const textCell = limited('text', column(record, 'text'))
    const cost = isBlank(costCell) ? null : costCell
    const wordText = isBlank(textCell) ? '' : textCell

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
    const missingColumns: WordColumn[] = []
    if (cost === null) missingColumns.push('cost')
    if (wordText === '') missingColumns.push('text')
    words.push({ row, word: { name, nameKey, cost, text: wordText }, missing: missingColumns })
  })

  return { words, errors }
}

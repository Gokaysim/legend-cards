import { normalize } from './cardCatalog.ts'
import { normalizeHeader, readRecords } from './csv.ts'

/**
 * The 18 custom effect types (spec: custom-cards, "Custom effect variants"). Scripts do not import app code: keep in
 * step with `EFFECT_TYPES` in `src/features/custom-draft/effectTypes.ts`. `customEffectRows.test.ts` fails if they
 * differ.
 */
export const CUSTOM_EFFECT_TYPES = [
  'Blessed',
  'Caster',
  'Combat',
  'Cursed',
  'Damage',
  'Discard',
  'Draw',
  'Effects',
  'Enhance',
  'Gain',
  'Gold',
  'Held',
  'Reduce',
  'Restore',
  'Roll',
  'Special',
  'TW',
  'XP',
] as const
export type CustomEffectType = (typeof CUSTOM_EFFECT_TYPES)[number]

/** The costs of the variants. */
export const VARIANT_COSTS = [1, 3, 5] as const
export type VariantCost = (typeof VARIANT_COSTS)[number]

/** The longest effect text. Keep in step with `EFFECT_TEXT_MAX` in `src/features/custom-draft/effectTypes.ts`. */
export const EFFECT_TEXT_MAX = 1000

/** The column of each cost, by its normalized header name ("1-cost version" reads as "1 cost version"). */
const costColumn = (cost: VariantCost) => normalizeHeader(`${cost}-cost version`)

/** The columns the file must have, as the owner's file writes them. */
export const EFFECT_COLUMNS = [
  'name',
  '1-cost version',
  '3-cost version',
  '5-cost version',
] as const

/** One variant read from the file. */
export type ParsedVariant = { row: number; type: CustomEffectType; cost: VariantCost; text: string }

/** A row skipped because its name is not one of the 18 types. `row` is the spreadsheet row: the header is row 1. */
export type SkippedRow = { row: number; name: string }

/** A cell skipped because it is empty. */
export type EmptyCell = { row: number; type: CustomEffectType; cost: VariantCost }

/** A problem that stops the import. */
export type EffectFileError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'too-long'; row: number; type: CustomEffectType; cost: VariantCost; max: number }
  | { kind: 'duplicate'; rows: [number, number]; type: CustomEffectType }

export type ParsedEffectFile = {
  variants: ParsedVariant[]
  skippedRows: SkippedRow[]
  emptyCells: EmptyCell[]
  errors: EffectFileError[]
}

/**
 * Other names the owner's file uses for a type: "True Word" for TW and "EXP" for XP (owner decision of 2026-11-24).
 * The pictures keep the short names (`1tw.png`, `1xp.png`).
 */
export const EFFECT_TYPE_ALIASES: Readonly<Record<string, CustomEffectType>> = {
  'True Word': 'TW',
  EXP: 'XP',
}

const TYPE_BY_KEY = new Map<string, CustomEffectType>([
  ...CUSTOM_EFFECT_TYPES.map((type) => [normalize(type), type] as const),
  ...Object.entries(EFFECT_TYPE_ALIASES).map(([alias, type]) => [normalize(alias), type] as const),
])

/**
 * Reads the custom effects file (spec: custom-cards, "Importing the custom effects"): one row per type, one text per
 * cost column, columns and names matched without regard to case, "True Word" and "EXP" read as TW and XP. A row whose
 * name is not a type is skipped, and so is
 * an empty cell; both are reported. A text over the limit or a type named twice stops the import: the caller writes
 * nothing if there is an error. Pure: no files, no Firebase.
 */
export function parseCustomEffectFile(text: string): ParsedEffectFile {
  const empty = { variants: [], skippedRows: [], emptyCells: [] }
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { ...empty, errors: [{ kind: 'unreadable', detail: records.error }] }
  }

  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = EFFECT_COLUMNS.filter((column) => !headers.includes(normalizeHeader(column)))
  if (missing.length > 0) {
    return { ...empty, errors: [{ kind: 'missing-columns', columns: [...missing] }] }
  }
  const cell = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const result: ParsedEffectFile = { variants: [], skippedRows: [], emptyCells: [], errors: [] }
  const firstRowByType = new Map<CustomEffectType, number>()

  rows.forEach((record, index) => {
    const row = index + 2
    if (record.every((value) => value.trim() === '')) return
    const name = cell(record, 'name')
    const type = TYPE_BY_KEY.get(normalize(name))
    if (type === undefined) {
      result.skippedRows.push({ row, name })
      return
    }
    const firstRow = firstRowByType.get(type)
    if (firstRow !== undefined) {
      result.errors.push({ kind: 'duplicate', rows: [firstRow, row], type })
      return
    }
    firstRowByType.set(type, row)
    for (const cost of VARIANT_COSTS) {
      const value = cell(record, costColumn(cost))
      if (value === '') {
        result.emptyCells.push({ row, type, cost })
      } else if (value.length > EFFECT_TEXT_MAX) {
        result.errors.push({ kind: 'too-long', row, type, cost, max: EFFECT_TEXT_MAX })
      } else {
        result.variants.push({ row, type, cost, text: value })
      }
    }
  })

  return result
}

import { parse } from 'csv-parse/sync'

import { isKnownMechanicPack, isKnownSetCode, normalize } from './cardCatalog.ts'

/** The two card files: Legend cards (normal and Blessed) and Cursed cards. */
export const DECKS = ['legend', 'cursed'] as const
export type Deck = (typeof DECKS)[number]

/** The kinds of card. Keep in step with `src/features/cards/schema.ts`. */
export type CardKind = 'normal' | 'blessed' | 'cursed'
export type Rarity = 'common' | 'rare'

/** A card definition as the import stores it (design D1). */
export type CardDefinition = {
  kind: CardKind
  name: string
  nameKey: string
  setCode: string | null
  cost: string | null
  rarity: Rarity | null
  mechanicPack: string | null
  text: string
}

/** Field limits. Keep in step with `src/features/cards/schema.ts`. */
export const LIMITS = {
  name: 200,
  setCode: 100,
  cost: 10,
  mechanicPack: 100,
  text: 2000,
} as const
export type LimitedField = keyof typeof LIMITS

/** The columns each file must have, by their normalized header names. */
export const REQUIRED_COLUMNS: Readonly<Record<Deck, readonly string[]>> = {
  legend: ['name', 'set', 'cost', 'rarity', 'text', 'mechanic pack'],
  cursed: ['name', 'cost', 'text'],
}

/** A problem that stops the import. `row` is the spreadsheet row number: the header is row 1. */
export type CardFileError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'empty-name'; row: number }
  | { kind: 'name-without-letters'; row: number; name: string }
  | { kind: 'too-long'; row: number; name: string; field: LimitedField; max: number }
  | { kind: 'invalid-rarity'; row: number; name: string; rarity: string }
  | { kind: 'blessed-with-rarity'; row: number; name: string; rarity: string }
  | { kind: 'duplicate'; rows: [number, number]; name: string }

/** A finding that does not stop the import. */
export type CardFileWarning =
  | { kind: 'skipped-without-set'; row: number; name: string }
  | { kind: 'unknown-set'; setCode: string; count: number }
  | { kind: 'unknown-mechanic-pack'; mechanicPack: string; count: number }

export type ParsedCard = { row: number; card: CardDefinition }

export type ParsedCardFile = {
  cards: ParsedCard[]
  errors: CardFileError[]
  warnings: CardFileWarning[]
}

/** "Common", "rare", "RARE" and so on. A Map, so a cell such as "constructor" finds nothing. */
const RARITIES: ReadonlyMap<string, Rarity> = new Map([
  ['common', 'common'],
  ['rare', 'rare'],
])

/** How the data writes "nothing here": an empty cell or a dash. */
const isBlank = (value: string) => value === '' || /^[—–-]$/.test(value)

/** Header names compared loosely, as the legacy import did: "Mechanic_Pack" and "mechanic pack" are the same. */
const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')

function readRecords(text: string): string[][] | { error: string } {
  try {
    return parse(text, { bom: true, relax_column_count: true, skip_empty_lines: false })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** Counts how often each value occurs, keeping the first spelling seen. */
function tally(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].map(([value, count]) => ({ value, count }))
}

/**
 * Reads one card file and checks every row (spec: admin-scripts, "Card file columns", "Legend card rows",
 * "Cursed card rows"). Returns all cards, errors and warnings; the caller writes nothing if there is an error.
 * Pure: no files, no Firebase.
 */
export function parseCardFile(text: string, deck: Deck): ParsedCardFile {
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { cards: [], errors: [{ kind: 'unreadable', detail: records.error }], warnings: [] }
  }

  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = REQUIRED_COLUMNS[deck].filter((column) => !headers.includes(column))
  if (missing.length > 0) {
    return { cards: [], errors: [{ kind: 'missing-columns', columns: missing }], warnings: [] }
  }
  const column = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const cards: ParsedCard[] = []
  const errors: CardFileError[] = []
  const warnings: CardFileWarning[] = []
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

    const rowErrors: CardFileError[] = []
    const limited = (field: LimitedField, value: string) => {
      if (value.length > LIMITS[field]) {
        rowErrors.push({ kind: 'too-long', row, name, field, max: LIMITS[field] })
      }
      return value
    }

    let card: CardDefinition
    const cost = limited('cost', column(record, 'cost'))
    const cardText = limited('text', column(record, 'text'))
    limited('name', name)

    if (deck === 'cursed') {
      card = {
        kind: 'cursed',
        name,
        nameKey,
        setCode: null,
        cost: isBlank(cost) ? null : cost,
        rarity: null,
        mechanicPack: null,
        text: cardText,
      }
    } else {
      const set = column(record, 'set')
      if (set === '') {
        warnings.push({ kind: 'skipped-without-set', row, name })
        return
      }
      const rarityCell = column(record, 'rarity')
      const mechanicPack = limited('mechanicPack', column(record, 'mechanic pack'))
      const isBlessed = normalize(set) === 'blessed'

      let rarity: Rarity | null = null
      if (isBlessed) {
        if (!isBlank(rarityCell)) {
          rowErrors.push({ kind: 'blessed-with-rarity', row, name, rarity: rarityCell })
        }
      } else {
        rarity = RARITIES.get(rarityCell.toLowerCase()) ?? null
        if (rarity === null)
          rowErrors.push({ kind: 'invalid-rarity', row, name, rarity: rarityCell })
      }

      card = {
        kind: isBlessed ? 'blessed' : 'normal',
        name,
        nameKey,
        setCode: isBlessed ? null : limited('setCode', set),
        cost: isBlank(cost) ? null : cost,
        rarity,
        mechanicPack: mechanicPack === '' ? null : mechanicPack,
        text: cardText,
      }
    }

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
    cards.push({ row, card })
  })

  const unknownSets = tally(
    cards.flatMap(({ card }) =>
      card.setCode !== null && !isKnownSetCode(card.setCode) ? [card.setCode] : [],
    ),
  )
  const unknownMechanicPacks = tally(
    cards.flatMap(({ card }) =>
      card.mechanicPack !== null && !isKnownMechanicPack(card.mechanicPack)
        ? [card.mechanicPack]
        : [],
    ),
  )
  warnings.push(
    ...unknownSets.map(({ value, count }) => ({
      kind: 'unknown-set' as const,
      setCode: value,
      count,
    })),
    ...unknownMechanicPacks.map(({ value, count }) => ({
      kind: 'unknown-mechanic-pack' as const,
      mechanicPack: value,
      count,
    })),
  )

  return { cards, errors, warnings }
}

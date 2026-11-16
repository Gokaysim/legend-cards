import { isKnownMechanicPack, normalize } from './cardCatalog.ts'
import { normalizeHeader, readRecords } from './csv.ts'

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

/**
 * A finding that does not stop the import. `parseCardFile` gives the mechanic pack warnings; the set warnings need the
 * stored sets, which `unknownSetWarnings` checks against.
 */
export type CardFileWarning =
  | { kind: 'unknown-set'; setCode: string; count: number }
  | { kind: 'unknown-mechanic-pack'; mechanicPack: string; count: number }

/** A column a card's kind uses. Keep in step with `missingCardFields` in `src/features/cards/schema.ts`. */
export type CardColumn = 'set' | 'cost' | 'rarity' | 'mechanic pack' | 'text'

/** The columns each kind uses (spec: admin-scripts, "Imported definitions are active unless a value is missing"). */
export const COLUMNS_USED: Readonly<Record<CardKind, readonly CardColumn[]>> = {
  normal: ['set', 'cost', 'rarity', 'mechanic pack', 'text'],
  blessed: ['cost', 'mechanic pack', 'text'],
  cursed: ['cost', 'text'],
}

/**
 * One card read from a file, with the columns its kind uses that the row leaves empty. A card without any is added
 * as active, and one with some as a draft.
 */
export type ParsedCard = { row: number; card: CardDefinition; missing: CardColumn[] }

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

/** An empty cell, or a dash ("deliberately none"), which counts as empty outside the Cost column. */
const isBlank = (value: string) => value === '' || /^[—–-]$/.test(value)

/** Counts how often each value occurs, keeping the first spelling seen. */
function tally(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].map(([value, count]) => ({ value, count }))
}

/**
 * Reads one card file and checks every row (spec: admin-scripts, "Card file columns", "Legend card rows",
 * "Cursed card rows"). Returns all cards with their missing columns, errors and warnings; the caller writes nothing if
 * there is an error. An empty value is never an error: it makes the card a draft. Pure: no files, no Firebase.
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
    // An empty Cost is missing; a dash there is "no cost", which a card may have. Elsewhere a dash counts as empty.
    const costCell = limited('cost', column(record, 'cost'))
    const textCell = limited('text', column(record, 'text'))
    const cardText = isBlank(textCell) ? '' : textCell
    const empty: CardColumn[] = []
    if (costCell === '') empty.push('cost')
    limited('name', name)

    if (deck === 'cursed') {
      card = {
        kind: 'cursed',
        name,
        nameKey,
        setCode: null,
        cost: isBlank(costCell) ? null : costCell,
        rarity: null,
        mechanicPack: null,
        text: cardText,
      }
    } else {
      const setCell = column(record, 'set')
      const rarityCell = column(record, 'rarity')
      const packCell = limited('mechanicPack', column(record, 'mechanic pack'))
      const isBlessed = normalize(setCell) === 'blessed'

      let rarity: Rarity | null = null
      if (isBlessed) {
        // The owner's export writes "Blessed" in a Blessed row's Rarity, which says what the Set column already says.
        if (!isBlank(rarityCell) && normalize(rarityCell) !== 'blessed') {
          rowErrors.push({ kind: 'blessed-with-rarity', row, name, rarity: rarityCell })
        }
      } else if (isBlank(rarityCell)) {
        empty.push('rarity')
      } else {
        rarity = RARITIES.get(rarityCell.toLowerCase()) ?? null
        if (rarity === null)
          rowErrors.push({ kind: 'invalid-rarity', row, name, rarity: rarityCell })
      }

      // A row without a set is a normal card without one: a draft until the DM chooses its set.
      const setCode = isBlessed || isBlank(setCell) ? null : limited('setCode', setCell)
      if (!isBlessed && setCode === null) empty.push('set')
      const mechanicPack = isBlank(packCell) ? null : packCell
      if (mechanicPack === null) empty.push('mechanic pack')

      card = {
        kind: isBlessed ? 'blessed' : 'normal',
        name,
        nameKey,
        setCode,
        cost: isBlank(costCell) ? null : costCell,
        rarity,
        mechanicPack,
        text: cardText,
      }
    }
    if (cardText === '') empty.push('text')

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
    // In the order the columns are used, so that every report names them the same way.
    const missingColumns = COLUMNS_USED[card.kind].filter((name) => empty.includes(name))
    cards.push({ row, card, missing: missingColumns })
  })

  const unknownMechanicPacks = tally(
    cards.flatMap(({ card }) =>
      card.mechanicPack !== null && !isKnownMechanicPack(card.mechanicPack)
        ? [card.mechanicPack]
        : [],
    ),
  )
  warnings.push(
    ...unknownMechanicPacks.map(({ value, count }) => ({
      kind: 'unknown-mechanic-pack' as const,
      mechanicPack: value,
      count,
    })),
  )

  return { cards, errors, warnings }
}

/**
 * One warning per set code that is no stored set's code or alias (spec: admin-scripts, "Import report"), with its card
 * count. `knownSpellings` are the stored sets' codes and aliases; case, accents and spaces are ignored. With no sets
 * stored, every set code is warned about. Pure.
 */
export function unknownSetWarnings(
  cards: readonly Pick<ParsedCard, 'card'>[],
  knownSpellings: readonly string[],
): CardFileWarning[] {
  const known = new Set(knownSpellings.map(normalize))
  return tally(
    cards.flatMap(({ card }) =>
      card.setCode !== null && !known.has(normalize(card.setCode)) ? [card.setCode] : [],
    ),
  ).map(({ value, count }) => ({ kind: 'unknown-set', setCode: value, count }))
}

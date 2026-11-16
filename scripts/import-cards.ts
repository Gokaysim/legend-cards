// Adds the card definitions from CSV files that are not stored yet:
//   npm run import-cards -- [--legend <csv>] [--cursed <csv>] [--dry-run] [--project <id>] [--yes]
// Without file options it imports both files in data/. A stored card is never changed: the DM edits cards in the
// app. A row with an empty value its kind uses is added as a draft. Stored cards from before statuses get one.
// Targets the local emulators unless --project names a real project (which must then be confirmed). Every file is
// checked before anything is written. Set codes that no stored set has as its code or alias are warned about, so run
// `npm run import-sets` first.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { parseArgs } from 'node:util'

import {
  type Deck,
  parseCardFile,
  type ParsedCardFile,
  unknownSetWarnings,
} from './lib/cardRows.ts'
import { type CardRow, runImport } from './lib/importCards.ts'
import { readSetSpellings } from './lib/importSets.ts'
import { DATA_FILES, dataPath, missingDefaultFile } from './lib/dataFiles.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

/** The owner's card files in data/, which only the owner's machine has (design D4 of add-ci-and-deploy). */
const DEFAULT_FILES: Readonly<Record<Deck, string>> = {
  legend: dataPath(DATA_FILES.legend),
  cursed: dataPath(DATA_FILES.cursed),
}

type Values = {
  legend?: string
  cursed?: string
  'dry-run'?: boolean
  project?: string
  yes?: boolean
}

/** The files to import: both defaults when neither option is given, otherwise only the decks named. */
function chooseFiles(values: Values): [Deck, string][] {
  if (!values.legend && !values.cursed) return Object.entries(DEFAULT_FILES) as [Deck, string][]
  return (['legend', 'cursed'] as const).flatMap((deck) => {
    const file = values[deck]
    return file ? [[deck, file] as [Deck, string]] : []
  })
}

const shownPath = (file: string) => relative(process.cwd(), file) || file

async function main(): Promise<number> {
  let values: Values
  try {
    values = parseArgs({
      options: {
        legend: { type: 'string' },
        cursed: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        ...TARGET_OPTIONS,
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(error instanceof Error ? error.message : String(error)))
    console.error(messages.usageImportCards)
    return 1
  }
  const dryRun = values['dry-run'] === true

  // 0. The default files exist only on the owner's machine: name a missing one before reading anything.
  if (!values.legend && !values.cursed) {
    const missing = missingDefaultFile(
      Object.values(DEFAULT_FILES).map((path) => ({ path, options: '--legend ve --cursed' })),
    )
    if (missing) {
      console.error(messages.dataFileMissing(shownPath(missing.path), missing.options))
      return 1
    }
  }

  // 1. Read and check every file before connecting, so a bad file never asks for confirmation.
  const parsed: { deck: Deck; file: string; result: ParsedCardFile }[] = []
  for (const [deck, file] of chooseFiles(values)) {
    let text: string
    try {
      text = await readFile(file, 'utf8')
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      console.error(messages.fileUnreadable(shownPath(file), detail))
      return 1
    }
    parsed.push({ deck, file: shownPath(file), result: parseCardFile(text, deck) })
  }

  const errors = parsed.flatMap(({ file, result }) =>
    result.errors.map((error) => messages.cardFileError(file, error)),
  )
  if (errors.length > 0) {
    for (const line of errors) console.error(line)
    console.error(messages.cardFilesInvalid(errors.length))
    return 1
  }

  // 2. Connect: emulators by default, a real project only when named and confirmed.
  const connection = await connect(values)
  if (!connection.ok) {
    console.error(connection.message)
    return 1
  }

  const { admin } = connection
  try {
    const decks: Partial<Record<Deck, CardRow[]>> = {}
    for (const { deck, result } of parsed) decks[deck] = result.cards

    // 3. The stored sets' spellings, for the set code warnings, also in a dry run.
    const setSpellings = await readSetSpellings(admin.db)

    // 4. Plan, write unless this is a dry run, and report.
    const { plan, written } = await runImport(admin.db, decks, { dryRun })

    if (dryRun) console.log(messages.dryRunHeader)
    for (const deckPlan of plan) {
      for (const line of messages.deckReport(deckPlan, dryRun)) console.log(line)
    }
    const warnings = parsed.flatMap(({ file, result }) =>
      [...unknownSetWarnings(result.cards, setSpellings), ...result.warnings].map((warning) =>
        messages.cardFileWarning(file, warning),
      ),
    )
    if (warnings.length > 0) {
      console.log(dryRun ? messages.dryRunWarningsHeader : messages.warningsHeader)
      for (const line of warnings) console.log(`  ${line}`)
    }
    if (!dryRun) console.log(messages.cardsWritten(written))
    return 0
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()

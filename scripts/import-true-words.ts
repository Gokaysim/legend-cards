// Imports the True Words from a CSV file:
//   npm run import-true-words -- [--file <csv>] [--dry-run] [--project <id>] [--yes]
// Without --file it imports data/true-words.csv. Targets the local emulators unless --project names a real
// project (which must then be confirmed). The whole file is checked before anything is written.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { runWordImport } from './lib/importTrueWords.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'
import { parseTrueWordFile } from './lib/trueWordRows.ts'

/** The repository's True Words file, found from this script's location so the working directory does not matter. */
const DEFAULT_FILE = fileURLToPath(new URL('../data/true-words.csv', import.meta.url))

type Values = {
  file?: string
  'dry-run'?: boolean
  project?: string
  yes?: boolean
}

const shownPath = (file: string) => relative(process.cwd(), file) || file

async function main(): Promise<number> {
  let values: Values
  try {
    values = parseArgs({
      options: {
        file: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        ...TARGET_OPTIONS,
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(error instanceof Error ? error.message : String(error)))
    console.error(messages.usageImportTrueWords)
    return 1
  }
  const dryRun = values['dry-run'] === true
  const file = values.file ?? DEFAULT_FILE

  // 1. Read and check the file before connecting, so a bad file never asks for confirmation.
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(messages.wordFileUnreadable(shownPath(file), detail))
    return 1
  }
  const parsed = parseTrueWordFile(text)
  if (parsed.errors.length > 0) {
    for (const error of parsed.errors)
      console.error(messages.trueWordFileError(shownPath(file), error))
    console.error(messages.trueWordFileInvalid(parsed.errors.length))
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
    // 3. Plan, write unless this is a dry run, and report.
    const words = parsed.words.map(({ word }) => word)
    const { plan, written } = await runWordImport(admin.db, words, { dryRun })

    if (dryRun) console.log(messages.dryRunWordsHeader)
    for (const line of messages.wordReport(plan, dryRun)) console.log(line)
    if (parsed.warnings.length > 0) {
      console.log(dryRun ? messages.dryRunWarningsHeader : messages.warningsHeader)
      for (const warning of parsed.warnings) {
        console.log(`  ${messages.trueWordFileWarning(shownPath(file), warning)}`)
      }
    }
    if (!dryRun) console.log(messages.wordsWritten(written))
    return 0
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()

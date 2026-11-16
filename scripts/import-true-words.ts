// Adds the True Words from a CSV file that are not stored yet:
//   npm run import-true-words -- [--file <csv>] [--dry-run] [--project <id>] [--yes]
// Without --file it imports data/true-words.csv. A stored word is never changed: the DM edits words in the app. A
// row with an empty cost or text is added as a draft. Stored words from before statuses get one. Targets the local
// emulators unless --project names a real project (which must then be confirmed). The whole file is checked before
// anything is written.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { parseArgs } from 'node:util'

import { runWordImport } from './lib/importTrueWords.ts'
import { DATA_FILES, dataPath, missingDefaultFile } from './lib/dataFiles.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'
import { parseTrueWordFile } from './lib/trueWordRows.ts'

/** The owner's True Words file in data/, which only the owner's machine has (design D4 of add-ci-and-deploy). */
const DEFAULT_FILE = dataPath(DATA_FILES.trueWords)

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
  if (values.file === undefined) {
    const missing = missingDefaultFile([{ path: DEFAULT_FILE, options: '--file' }])
    if (missing) {
      console.error(messages.dataFileMissing(shownPath(missing.path), missing.options))
      return 1
    }
  }

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
    const { plan, written } = await runWordImport(admin.db, parsed.words, { dryRun })

    if (dryRun) console.log(messages.dryRunWordsHeader)
    for (const line of messages.wordReport(plan, dryRun)) console.log(line)
    if (!dryRun) console.log(messages.wordsWritten(written))
    return 0
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()

// Loads the custom effect texts of the Custom Card Draft from a CSV file:
//   npm run import-custom-effects -- [--file <csv>] [--dry-run] [--project <id>] [--yes]
// Without --file it imports data/custom-effects.csv. Each row is one of the 18 effect types, with its 1, 3 and 5-cost
// texts. A variant in the file replaces the stored text; a row that is not a type and an empty cell are skipped and
// reported. Finished Custom Cards keep their own texts. Targets the local emulators unless --project names a real
// project (which must then be confirmed). The whole file is checked before anything is written.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { parseArgs } from 'node:util'

import { parseCustomEffectFile } from './lib/customEffectRows.ts'
import { DATA_FILES, dataPath, missingDefaultFile } from './lib/dataFiles.ts'
import { runEffectImport } from './lib/importCustomEffects.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

/** The owner's custom effects file in data/, which only the owner's machine has. */
const DEFAULT_FILE = dataPath(DATA_FILES.customEffects)

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
    console.error(messages.usageImportCustomEffects)
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
    console.error(messages.effectFileUnreadable(shownPath(file), detail))
    return 1
  }
  const parsed = parseCustomEffectFile(text)
  if (parsed.errors.length > 0) {
    for (const error of parsed.errors)
      console.error(messages.effectFileError(shownPath(file), error))
    console.error(messages.effectFileInvalid(parsed.errors.length))
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
    const { plan, written } = await runEffectImport(admin.db, parsed.variants, { dryRun })
    if (dryRun) console.log(messages.dryRunEffectsHeader)
    const skipped = { rows: parsed.skippedRows, cells: parsed.emptyCells }
    for (const line of messages.effectReport(plan, skipped, dryRun)) console.log(line)
    if (!dryRun) console.log(messages.effectsWritten(written))
    return 0
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()

// Adds the sets of a CSV file that are not stored yet, and with an archive folder their cardbacks and Cardmakers:
//   npm run import-sets -- [--file <csv>] [--source <folder>] [--dry-run] [--project <id>] [--yes] [--bucket <name>]
// Without --file it imports data/sets.csv. A stored set is never changed, reordered or deleted: the DM manages the
// sets in the app (Setler). The added sets come after the stored ones, in the file's order. With --source, it reads the
// folder's .7z archives (extracted with 7-Zip into a temporary folder) and loose .png files, never changing them, and
// gives each set its `<set>_cb` cardback and `cardmaker_<set>` Cardmaker, only where the set never had one. Targets the
// local emulators unless --project names a real project (which must then be confirmed). The file is checked before
// anything is written.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { parseArgs } from 'node:util'

import {
  ExtractError,
  hasSevenZip,
  listSource,
  type PictureSourceFile,
  sourceFolder,
  withSourceFiles,
} from './lib/archives.ts'
import { type ArtAlias, readAliases } from './lib/artFiles.ts'
import { bucketPictureStore } from './lib/importPictures.ts'
import { planSets, readStoredSets, runSetImport, setArtData } from './lib/importSets.ts'
import { DATA_FILES, dataPath, type DefaultFile, missingDefaultFile } from './lib/dataFiles.ts'
import { messages } from './lib/messages.ts'
import { parseSetFile } from './lib/setRows.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

/** The owner's files in data/, which only the owner's machine has (design D4 of add-ci-and-deploy). */
const DEFAULT_FILE = dataPath(DATA_FILES.sets)
const ALIASES_FILE = dataPath(DATA_FILES.aliases)

type Values = {
  file?: string
  source?: string
  'dry-run'?: boolean
  project?: string
  yes?: boolean
  bucket?: string
}

const shownPath = (path: string) => relative(process.cwd(), path) || path
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function main(): Promise<number> {
  let values: Values
  try {
    values = parseArgs({
      options: {
        file: { type: 'string' },
        source: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        ...TARGET_OPTIONS,
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(errorText(error)))
    console.error(messages.usageImportSets)
    return 1
  }
  const dryRun = values['dry-run'] === true

  // 0. The default files exist only on the owner's machine: name a missing one before reading anything.
  const defaults: DefaultFile[] = [
    ...(values.file === undefined ? [{ path: DEFAULT_FILE, options: '--file' }] : []),
    ...(values.source !== undefined ? [{ path: ALIASES_FILE, options: null }] : []),
  ]
  const missing = missingDefaultFile(defaults)
  if (missing) {
    console.error(messages.dataFileMissing(shownPath(missing.path), missing.options))
    return 1
  }

  // 1. Read and check the set file before connecting, so a bad file never asks for confirmation.
  const file = values.file ?? DEFAULT_FILE
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    console.error(messages.setFileUnreadable(shownPath(file), errorText(error)))
    return 1
  }
  const parsed = parseSetFile(text)
  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) console.error(messages.setFileError(shownPath(file), error))
    console.error(messages.setFileInvalid(parsed.errors.length))
    return 1
  }

  // 2. With an archive folder: 7-Zip and the folder, also before connecting.
  let source: { folder: string; listed: Awaited<ReturnType<typeof listSource>> } | null = null
  if (values.source !== undefined) {
    const folder = sourceFolder(values.source)
    if (!(await hasSevenZip())) {
      console.error(messages.sevenZipMissing)
      return 1
    }
    let listed: Awaited<ReturnType<typeof listSource>>
    try {
      listed = await listSource(folder)
    } catch (error) {
      console.error(messages.sourceUnreadable(folder, errorText(error)))
      return 1
    }
    if (listed.archives.length === 0 && listed.loose.length === 0) {
      console.error(messages.noSourceFiles(folder))
      return 1
    }
    source = { folder, listed }
  }
  const aliasText = source ? await readFile(ALIASES_FILE, 'utf8') : null

  // 3. Connect: emulators by default, a real project only when named and confirmed.
  const connection = await connect(values)
  if (!connection.ok) {
    console.error(connection.message)
    return 1
  }
  const { admin } = connection
  try {
    const stored = await readStoredSets(admin.db)
    const store = bucketPictureStore(admin.storage)
    const showProgress = process.stdout.isTTY && !dryRun

    /** Plans, writes unless this is a dry run, and reports. */
    const importWith = async (
      pictures: { files: PictureSourceFile[]; aliases: ArtAlias[] } | null,
    ): Promise<number> => {
      try {
        const { plan, written } = await runSetImport(
          admin.db,
          store,
          parsed.sets,
          stored,
          pictures,
          {
            dryRun,
            onProgress: (done, total) => {
              if (showProgress) process.stdout.write(`\r${messages.setsProgress(done, total)}`)
            },
          },
        )
        if (showProgress && pictures !== null) process.stdout.write('\n')
        if (dryRun) console.log(messages.dryRunSetsHeader)
        for (const line of messages.setsReport(plan, pictures?.files.length ?? null, dryRun)) {
          console.log(line)
        }
        if (written !== null) console.log(messages.setsWritten(written))
        return 0
      } catch (error) {
        if (showProgress && pictures !== null) process.stdout.write('\n')
        console.error(messages.setsFailed(errorText(error)))
        return 1
      }
    }

    if (source === null || aliasText === null) return await importWith(null)

    // 4. The alias table checked against the sets after the import, before anything is extracted.
    const aliases = readAliases(
      aliasText,
      setArtData(stored, planSets(parsed.sets, stored)),
      'sets',
    )
    if (aliases.errors.length > 0) {
      for (const error of aliases.errors) {
        console.error(messages.aliasError(shownPath(ALIASES_FILE), error))
      }
      console.error(messages.aliasesInvalid(aliases.errors.length))
      return 1
    }

    // 5. Extract, then plan, write and report.
    return await withSourceFiles(
      source.folder,
      source.listed,
      (archive) => console.log(messages.extracting(archive)),
      (files) => importWith({ files, aliases: aliases.aliases }),
    )
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error
    console.error(messages.extractFailed(error.archive, error.message))
    return 1
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()

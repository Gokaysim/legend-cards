// Stores the owner's card and True Word pictures in Cloud Storage, for the stored definitions that never had one:
//   npm run import-pictures -- --source <folder> [--dry-run] [--project <id>] [--yes] [--bucket <name>]
// Reads the folder's .7z archives (extracted with 7-Zip into a temporary folder) and loose .png files, never changing
// them. Matches the files to the stored cards and words, by their IDs and names and the alias table, converts them to
// WebP as the picture build does, and sets each picture on its definition. It only adds: a definition with a picture,
// or whose picture the DM removed, is left alone, so running it again adds only what is new. Targets the local
// emulators unless --project names a real project (which must then be confirmed). The cardbacks, packs and Cardmaker
// are left to `npm run build-art` (design D9 of upload-card-and-word-pictures), and the sets' cardbacks and
// Cardmakers to `npm run import-sets` (design D10 of add-set-management).
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { parseArgs } from 'node:util'

import {
  ExtractError,
  hasSevenZip,
  listSource,
  sourceFolder,
  withSourceFiles,
} from './lib/archives.ts'
import { readAliases } from './lib/artFiles.ts'
import {
  artDataOf,
  bucketPictureStore,
  readPictureDefinitions,
  runPictureImport,
} from './lib/importPictures.ts'
import { DATA_FILES, dataPath, missingDefaultFile } from './lib/dataFiles.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

const ALIASES_FILE = dataPath(DATA_FILES.aliases)

type Values = {
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
        source: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        ...TARGET_OPTIONS,
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(errorText(error)))
    console.error(messages.usageImportPictures)
    return 1
  }
  if (!values.source) {
    console.error(messages.usageImportPictures)
    return 1
  }
  const dryRun = values['dry-run'] === true
  const source = sourceFolder(values.source)

  // 1. The alias table (only the owner's machine has it), 7-Zip and the source folder, before connecting, so a
  // missing file or tool never asks for confirmation.
  const missing = missingDefaultFile([{ path: ALIASES_FILE, options: null }])
  if (missing) {
    console.error(messages.dataFileMissing(shownPath(missing.path), missing.options))
    return 1
  }
  if (!(await hasSevenZip())) {
    console.error(messages.sevenZipMissing)
    return 1
  }
  let listed: Awaited<ReturnType<typeof listSource>>
  try {
    listed = await listSource(source)
  } catch (error) {
    console.error(messages.sourceUnreadable(source, errorText(error)))
    return 1
  }
  if (listed.archives.length === 0 && listed.loose.length === 0) {
    console.error(messages.noSourceFiles(source))
    return 1
  }
  const aliasText = await readFile(ALIASES_FILE, 'utf8')

  // 2. Connect: emulators by default, a real project only when named and confirmed.
  const connection = await connect(values)
  if (!connection.ok) {
    console.error(connection.message)
    return 1
  }
  const { admin } = connection
  try {
    // 3. The stored definitions, and the alias table checked against them, before anything is extracted.
    const definitions = await readPictureDefinitions(admin.db)
    const aliases = readAliases(aliasText, artDataOf(definitions), 'definitions')
    if (aliases.errors.length > 0) {
      for (const error of aliases.errors) {
        console.error(messages.aliasError(shownPath(ALIASES_FILE), error))
      }
      console.error(messages.aliasesInvalid(aliases.errors.length))
      return 1
    }

    // 4. Extract, plan and report; store unless this is a dry run.
    return await withSourceFiles(
      source,
      listed,
      (archive) => console.log(messages.extracting(archive)),
      async (files) => {
        const showProgress = process.stdout.isTTY && !dryRun
        try {
          const { plan, written } = await runPictureImport(
            admin.db,
            bucketPictureStore(admin.storage),
            files,
            aliases.aliases,
            definitions,
            {
              dryRun,
              onProgress: (done, total) => {
                if (showProgress)
                  process.stdout.write(`\r${messages.picturesProgress(done, total)}`)
              },
            },
          )
          if (showProgress) process.stdout.write('\n')
          if (dryRun) console.log(messages.dryRunPicturesHeader)
          for (const line of messages.picturesReport(plan, files.length)) console.log(line)
          if (written !== null) {
            console.log(
              messages.picturesWritten(
                written.added.length,
                written.changedMeanwhile.map(({ name }) => name),
              ),
            )
          }
          return 0
        } catch (error) {
          if (showProgress) process.stdout.write('\n')
          console.error(messages.picturesFailed(errorText(error)))
          return 1
        }
      },
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

// Builds the cardback, pack and Cardmaker pictures from the owner's archives:
//   npm run build-art -- --source <folder> [--dry-run]
// Reads the folder's .7z archives (extracted with 7-Zip into a temporary folder) and loose .png files, never
// changing them. Matches the files by the legacy asset names and the alias table, reports in Turkish, and, unless
// this is a dry run, writes the WebP pictures and their manifest to public/art/. The card and True Word pictures are
// left to `npm run import-pictures`, which stores them in Cloud Storage (design D10 of upload-card-and-word-pictures).
// Never reads or writes Firestore or Cloud Storage.
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import {
  ExtractError,
  hasSevenZip,
  listSource,
  type PictureSourceFile,
  sourceFolder,
  withSourceFiles,
} from './lib/archives.ts'
import { type ArtAlias, NO_DEFINITIONS, planArt, readAliases } from './lib/artFiles.ts'
import { writeArt } from './lib/artWrite.ts'
import { messages } from './lib/messages.ts'

/** The repository's files, found from this script's location so the working directory does not matter. */
const repoFile = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const ALIASES_FILE = repoFile('data/image-aliases.csv')
const OUT_DIR = repoFile('public/art')

type Values = { source?: string; 'dry-run'?: boolean }

const shownPath = (path: string) => relative(process.cwd(), path) || path
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function main(): Promise<number> {
  let values: Values
  try {
    values = parseArgs({
      options: { source: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(errorText(error)))
    console.error(messages.usageBuildArt)
    return 1
  }
  if (!values.source) {
    console.error(messages.usageBuildArt)
    return 1
  }
  const dryRun = values['dry-run'] === true
  const source = sourceFolder(values.source)

  // 1. 7-Zip and the alias table, before anything is extracted or written.
  if (!(await hasSevenZip())) {
    console.error(messages.sevenZipMissing)
    return 1
  }
  const aliases = readAliases(await readFile(ALIASES_FILE, 'utf8'), NO_DEFINITIONS, 'assets')
  if (aliases.errors.length > 0) {
    for (const error of aliases.errors) {
      console.error(messages.aliasError(shownPath(ALIASES_FILE), error))
    }
    console.error(messages.aliasesInvalid(aliases.errors.length))
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

  // 2. Extract each archive into its own folder of a temporary folder, removed at the end, even on Ctrl+C.
  try {
    return await withSourceFiles(
      source,
      listed,
      (archive) => console.log(messages.extracting(archive)),
      (files) => buildFrom(files, aliases.aliases, dryRun),
    )
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error
    console.error(messages.extractFailed(error.archive, error.message))
    return 1
  }
}

/** Plans, reports and, unless this is a dry run, writes the pictures. */
async function buildFrom(
  files: PictureSourceFile[],
  aliases: readonly ArtAlias[],
  dryRun: boolean,
): Promise<number> {
  // 3. Plan and report.
  const plan = planArt(files, NO_DEFINITIONS, aliases, 'assets')
  if (dryRun) console.log(messages.dryRunArtHeader)
  for (const line of messages.artReport(plan, files.length)) console.log(line)
  if (dryRun) return 0

  // 4. Write.
  const showProgress = process.stdout.isTTY
  try {
    await writeArt(plan.assignments, OUT_DIR, {
      onProgress: (done, total) => {
        if (showProgress) process.stdout.write(`\r${messages.artProgress(done, total)}`)
      },
    })
  } catch (error) {
    if (showProgress) process.stdout.write('\n')
    console.error(messages.artWriteFailed(errorText(error)))
    return 1
  }
  if (showProgress) process.stdout.write('\n')
  console.log(messages.artWritten(plan.assignments.length, shownPath(OUT_DIR)))
  return 0
}

process.exitCode = await main()

// Builds the card, cardback, pack, True Word and Cardmaker pictures from the owner's archives:
//   npm run build-art -- --source <folder> [--dry-run]
// Reads the folder's .7z archives (extracted with 7-Zip into a temporary folder) and loose .png files, never
// changing them. Matches the files to the data in data/ and the alias table, reports in Turkish, and, unless this is
// a dry run, writes the WebP pictures and their manifest to public/art/. Never reads or writes Firestore.
import { execFile } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'

import { type ArtData, planArt, readAliases } from './lib/artFiles.ts'
import { type SourceFile, writeArt } from './lib/artWrite.ts'
import { parseCardFile } from './lib/cardRows.ts'
import { messages } from './lib/messages.ts'
import { parseTrueWordFile } from './lib/trueWordRows.ts'

const run = promisify(execFile)

/** The repository's files, found from this script's location so the working directory does not matter. */
const repoFile = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const DATA_FILES = {
  legend: repoFile('data/legend-cards.csv'),
  cursed: repoFile('data/cursed-cards.csv'),
  words: repoFile('data/true-words.csv'),
  aliases: repoFile('data/image-aliases.csv'),
}
const OUT_DIR = repoFile('public/art')

/** 7-Zip's command-line program, as Homebrew's `sevenzip` installs it. */
const SEVEN_ZIP = '7zz'

/** A picture file with the archive it came from, `null` for a loose file in the folder. */
type BuildFile = SourceFile & { from: string | null }

type Values = { source?: string; 'dry-run'?: boolean }

const shownPath = (path: string) => relative(process.cwd(), path) || path
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const isPng = (name: string) => /\.png$/i.test(name)
const isArchive = (name: string) => /\.7z$/i.test(name)

async function hasSevenZip(): Promise<boolean> {
  try {
    await run(SEVEN_ZIP, ['i'])
    return true
  } catch (error) {
    // Only a missing program means 7-Zip is not installed; let any other failure show up when extracting.
    return (error as NodeJS.ErrnoException).code !== 'ENOENT'
  }
}

/** Reads the data the pictures are matched against, printing any error. `null` when there is one. */
async function readData(): Promise<ArtData | null> {
  const [legendText, cursedText, wordsText] = await Promise.all(
    [DATA_FILES.legend, DATA_FILES.cursed, DATA_FILES.words].map((file) => readFile(file, 'utf8')),
  )
  const legend = parseCardFile(legendText ?? '', 'legend')
  const cursed = parseCardFile(cursedText ?? '', 'cursed')
  const words = parseTrueWordFile(wordsText ?? '')
  const errors = [
    ...legend.errors.map((error) => messages.cardFileError(shownPath(DATA_FILES.legend), error)),
    ...cursed.errors.map((error) => messages.cardFileError(shownPath(DATA_FILES.cursed), error)),
    ...words.errors.map((error) => messages.trueWordFileError(shownPath(DATA_FILES.words), error)),
  ]
  if (errors.length > 0) {
    for (const line of errors) console.error(line)
    console.error(messages.artDataInvalid(errors.length))
    return null
  }
  return {
    legend: legend.cards.map(({ card }) => card),
    cursed: cursed.cards.map(({ card }) => card),
    words: words.words.map(({ word }) => word),
  }
}

/** Extracts one archive of the source folder into its own new folder and lists its PNG files. */
async function extract(source: string, archive: string, into: string): Promise<BuildFile[]> {
  await mkdir(into)
  // `e` extracts without the archive's folders, so no path can leave `into`.
  await run(SEVEN_ZIP, ['e', '-y', '-bso0', '-bsp0', `-o${into}`, join(source, archive)], {
    maxBuffer: 16 * 1024 * 1024,
  })
  const names = (await readdir(into)).filter(isPng)
  return names.map((name) => ({ name, path: join(into, name), from: archive }))
}

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
  const source = resolve(values.source.replace(/^~(?=$|\/)/, homedir()))

  // 1. 7-Zip, the data and the alias table, before anything is extracted or written.
  if (!(await hasSevenZip())) {
    console.error(messages.sevenZipMissing)
    return 1
  }
  const data = await readData()
  if (data === null) return 1
  const aliases = readAliases(await readFile(DATA_FILES.aliases, 'utf8'), data)
  if (aliases.errors.length > 0) {
    for (const error of aliases.errors) {
      console.error(messages.aliasError(shownPath(DATA_FILES.aliases), error))
    }
    console.error(messages.aliasesInvalid(aliases.errors.length))
    return 1
  }

  let entries: string[]
  try {
    entries = (await readdir(source)).sort()
  } catch (error) {
    console.error(messages.sourceUnreadable(source, errorText(error)))
    return 1
  }
  const archives = entries.filter(isArchive)
  const loose: BuildFile[] = entries
    .filter(isPng)
    .map((name) => ({ name, path: join(source, name), from: null }))
  if (archives.length === 0 && loose.length === 0) {
    console.error(messages.noSourceFiles(source))
    return 1
  }

  // 2. Extract each archive into its own folder of a temporary folder, removed at the end, even on Ctrl+C.
  const temp = await mkdtemp(join(tmpdir(), 'legend-cards-art-'))
  const removeTemp = () => rmSync(temp, { recursive: true, force: true })
  const onInterrupt = () => {
    removeTemp()
    process.exit(130)
  }
  process.once('SIGINT', onInterrupt)
  try {
    const files = [...loose]
    for (const [index, archive] of archives.entries()) {
      console.log(messages.extracting(archive))
      try {
        files.push(...(await extract(source, archive, join(temp, String(index)))))
      } catch (error) {
        console.error(messages.extractFailed(archive, errorText(error)))
        return 1
      }
    }

    // 3. Plan and report.
    const plan = planArt(files, data, aliases.aliases)
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
  } finally {
    process.off('SIGINT', onInterrupt)
    removeTemp()
  }
}

process.exitCode = await main()

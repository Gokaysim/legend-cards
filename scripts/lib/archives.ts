// The owner's picture archives (data/README.md, "Pictures"): the `.7z` archives and loose PNG files of a source folder,
// extracted with 7-Zip into a temporary folder that is removed at the end, also after a failure or Ctrl+C. Shared by
// `build-art` (the cardbacks, packs and Cardmaker) and `import-pictures` (the card and True Word pictures). Never
// changes the source folder.
import { execFile } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdir, mkdtemp, readdir } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import type { SourceFile } from './artWrite.ts'

const run = promisify(execFile)

/** 7-Zip's command-line program, as Homebrew's `sevenzip` installs it. */
const SEVEN_ZIP = '7zz'

/** A picture file with the archive it came from, `null` for a loose file in the folder. */
export type PictureSourceFile = SourceFile & { from: string | null }

export const isPng = (name: string) => /\.png$/i.test(name)
export const isArchive = (name: string) => /\.7z$/i.test(name)

/** The source folder option as a path: `~` stands for the home folder. */
export function sourceFolder(value: string): string {
  return resolve(value.replace(/^~(?=$|\/)/, homedir()))
}

export async function hasSevenZip(): Promise<boolean> {
  try {
    await run(SEVEN_ZIP, ['i'])
    return true
  } catch (error) {
    // Only a missing program means 7-Zip is not installed; let any other failure show up when extracting.
    return (error as NodeJS.ErrnoException).code !== 'ENOENT'
  }
}

/** The folder's archives and loose PNG files, by name. Throws when the folder cannot be read. */
export async function listSource(
  source: string,
): Promise<{ archives: string[]; loose: PictureSourceFile[] }> {
  const entries = (await readdir(source)).sort()
  return {
    archives: entries.filter(isArchive),
    loose: entries.filter(isPng).map((name) => ({ name, path: join(source, name), from: null })),
  }
}

/** An archive that 7-Zip could not extract. */
export class ExtractError extends Error {
  override readonly name = 'ExtractError'
  readonly archive: string

  constructor(archive: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.archive = archive
  }
}

/** Extracts one archive of the source folder into its own new folder and lists its PNG files. */
async function extract(
  source: string,
  archive: string,
  into: string,
): Promise<PictureSourceFile[]> {
  await mkdir(into)
  // `e` extracts without the archive's folders, so no path can leave `into`.
  await run(SEVEN_ZIP, ['e', '-y', '-bso0', '-bsp0', `-o${into}`, join(source, archive)], {
    maxBuffer: 16 * 1024 * 1024,
  })
  const names = (await readdir(into)).filter(isPng)
  return names.map((name) => ({ name, path: join(into, name), from: archive }))
}

/**
 * Extracts each archive into its own folder of a temporary folder, then gives `work` every picture file, the loose ones
 * first. The temporary folder is removed when `work` ends, also after a failure or Ctrl+C. Throws `ExtractError` for an
 * archive that cannot be extracted.
 */
export async function withSourceFiles<T>(
  source: string,
  listed: { archives: readonly string[]; loose: readonly PictureSourceFile[] },
  onExtracting: (archive: string) => void,
  work: (files: PictureSourceFile[]) => Promise<T>,
): Promise<T> {
  const temp = await mkdtemp(join(tmpdir(), 'legend-cards-art-'))
  const removeTemp = () => rmSync(temp, { recursive: true, force: true })
  const onInterrupt = () => {
    removeTemp()
    process.exit(130)
  }
  process.once('SIGINT', onInterrupt)
  try {
    const files = [...listed.loose]
    for (const [index, archive] of listed.archives.entries()) {
      onExtracting(archive)
      try {
        files.push(...(await extract(source, archive, join(temp, String(index)))))
      } catch (error) {
        throw new ExtractError(archive, error)
      }
    }
    return await work(files)
  } finally {
    process.off('SIGINT', onInterrupt)
    removeTemp()
  }
}

// The owner's data files in `data/` (design D4 of add-ci-and-deploy): they stay on the owner's machine and are never
// committed, so a fresh clone or the CI runner has none of them. The scripts check their default files here before
// they read anything, and the tests that need the real data run only when it is present.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The file names in `data/`, by what they hold. */
export const DATA_FILES = {
  legend: 'legend-cards.csv',
  cursed: 'cursed-cards.csv',
  trueWords: 'true-words.csv',
  sets: 'sets.csv',
  aliases: 'image-aliases.csv',
  inventory: 'art-inventory.json',
} as const

export type DataFile = (typeof DATA_FILES)[keyof typeof DATA_FILES]

/** The absolute path of a file in `data/`, found from this module so the working directory does not matter. */
export const dataPath = (name: DataFile): string =>
  fileURLToPath(new URL(`../../data/${name}`, import.meta.url))

/** A file a script reads when no option names another one, and the options that would. */
export type DefaultFile = {
  path: string
  /** The options that take another file, as the usage writes them, or `null` when there is none. */
  options: string | null
}

/** The first default file that does not exist, or `null` when all do. */
export function missingDefaultFile(
  files: readonly DefaultFile[],
  exists: (path: string) => boolean = existsSync,
): DefaultFile | null {
  return files.find((file) => !exists(file.path)) ?? null
}

/** Whether every named file is in `data/`: the tests of the owner's real data run only then. */
export const hasOwnerData = (...names: DataFile[]): boolean =>
  names.every((name) => existsSync(dataPath(name)))

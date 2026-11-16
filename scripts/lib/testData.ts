// The data files the tests read (design D5 of add-ci-and-deploy): the small invented files kept with the tests, and the
// owner's real files in `data/`, which only the owner's machine has. Tests of the real files run inside
// `describe.skipIf(!hasOwnerData(...))`, so a clone without them skips those tests instead of failing.
import { readFileSync } from 'node:fs'

import { type DataFile, dataPath } from './dataFiles.ts'

export { DATA_FILES, hasOwnerData } from './dataFiles.ts'

/** A test fixture in `tests/fixtures/data/`, in the format of the owner's file of the same name. */
export const fixtureFile = (name: DataFile): string =>
  readFileSync(new URL(`../../tests/fixtures/data/${name}`, import.meta.url), 'utf8')

/** One of the owner's files in `data/`. Read it only where `hasOwnerData` said it is there. */
export const ownerFile = (name: DataFile): string => readFileSync(dataPath(name), 'utf8')

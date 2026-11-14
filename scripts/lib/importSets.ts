import { FieldValue, type Firestore } from 'firebase-admin/firestore'

import {
  type ArtAlias,
  type ArtData,
  type ArtFile,
  type ArtPlan,
  type ArtSet,
  NO_DEFINITIONS,
  planArt,
} from './artFiles.ts'
import { contentHash, convertPicture, type SourceFile } from './artWrite.ts'
import { normalize } from './cardCatalog.ts'
import { BATCH_SIZE } from './importCards.ts'
import type { PictureFileStore, PictureState } from './importPictures.ts'
import type { PackLayout, SetRow } from './setRows.ts'

// The set import (design D10 of add-set-management): the sets of `data/sets.csv` that are not stored yet, and with an
// archive folder the sets' cardbacks and Cardmakers, converted as the picture build converts them and stored in Cloud
// Storage. It only adds: a stored set, and a picture the DM uploaded or removed, are never touched.

/** The set collection. Keep in step with `src/features/sets/api.ts` and `firestore.rules`. */
export const SETS_COLLECTION = 'sets'

/** The set change records. Keep in step with `src/features/sets/api.ts` and `firestore.rules`. */
export const SET_CHANGES_COLLECTION = 'setChanges'

/** The Cloud Storage folder of the set pictures. Keep in step with the app's set picture paths and `storage.rules`. */
const PICTURE_FOLDER = 'sets'

/** A set's picture fields: its cardback and its Cardmaker. */
export const SET_PICTURE_FIELDS = ['cardback', 'mascot'] as const
export type SetPictureField = (typeof SET_PICTURE_FIELDS)[number]

/** What "İndir" calls each picture, after the set's ID. */
const DOWNLOAD_SUFFIX: Readonly<Record<SetPictureField, string>> = {
  cardback: 'cardback',
  mascot: 'cardmaker',
}

/** A set's document ID: its code, normalized as card names are (design D1). */
export const setIdOf = (code: string) => normalize(code)

/** A stored set, as the import sees it. */
export type StoredSet = {
  setId: string
  code: string
  name: string
  aliases: string[]
  position: number
  /** Each picture field: never had one (no field), removed by the DM (`null`), or a path. */
  pictures: Record<SetPictureField, PictureState>
}

function pictureStateOf(data: Record<string, unknown>, field: SetPictureField): PictureState {
  if (!(field in data)) return { kind: 'never' }
  const value = data[field]
  return typeof value === 'string' ? { kind: 'stored', path: value } : { kind: 'removed' }
}

const byPosition = (
  a: { position: number; setId: string },
  b: { position: number; setId: string },
) => a.position - b.position || (a.setId < b.setId ? -1 : a.setId > b.setId ? 1 : 0)

/** Every stored set, in their order: by position, then by ID. Read defensively: the import copes with anything. */
export async function readStoredSets(db: Firestore): Promise<StoredSet[]> {
  const snapshot = await db.collection(SETS_COLLECTION).get()
  return snapshot.docs
    .map((document) => {
      const data = document.data()
      return {
        setId: document.id,
        code: typeof data.code === 'string' ? data.code : document.id,
        name: typeof data.name === 'string' ? data.name : document.id,
        aliases: Array.isArray(data.aliases)
          ? data.aliases.filter((alias): alias is string => typeof alias === 'string')
          : [],
        position: typeof data.position === 'number' ? data.position : 0,
        pictures: {
          cardback: pictureStateOf(data, 'cardback'),
          mascot: pictureStateOf(data, 'mascot'),
        },
      }
    })
    .sort(byPosition)
}

/** The spellings of the stored sets that a card's set code may use: every code and alias. */
export function setSpellings(sets: readonly Pick<StoredSet, 'code' | 'aliases'>[]): string[] {
  return sets.flatMap(({ code, aliases }) => [code, ...aliases])
}

/** The stored sets' codes and aliases, read with the Admin SDK: what the card import checks set codes against. */
export async function readSetSpellings(db: Firestore): Promise<string[]> {
  return setSpellings(await readStoredSets(db))
}

/** A set the import adds, with the document it gets. */
export type NewSet = {
  setId: string
  code: string
  name: string
  aliases: string[]
  position: number
  packLayout: PackLayout
}

export type SetPlan = {
  /** The sets to add, in the file's order, after the stored ones. */
  added: NewSet[]
  /** The rows left alone, each with the stored set that has its code as a code or alias. */
  existing: { row: SetRow; stored: StoredSet }[]
}

/**
 * Decides which rows add a set (spec: admin-scripts, "The set import only adds"): a row is left alone when a stored set
 * has its code as a code or alias, ignoring case, accents and spaces. Every other row adds a set after the stored
 * ones, in the file's order. Pure.
 */
export function planSets(rows: readonly SetRow[], stored: readonly StoredSet[]): SetPlan {
  const storedBySpelling = new Map<string, StoredSet>()
  for (const set of stored) {
    for (const spelling of [set.setId, set.code, ...set.aliases]) {
      const key = normalize(spelling)
      if (!storedBySpelling.has(key)) storedBySpelling.set(key, set)
    }
  }
  let next = stored.length === 0 ? 0 : Math.max(...stored.map(({ position }) => position)) + 1
  const plan: SetPlan = { added: [], existing: [] }
  for (const row of rows) {
    const match = storedBySpelling.get(setIdOf(row.code))
    if (match) {
      plan.existing.push({ row, stored: match })
      continue
    }
    plan.added.push({
      setId: setIdOf(row.code),
      code: row.code,
      name: row.name,
      aliases: [...row.aliases],
      position: next++,
      packLayout: row.packLayout,
    })
  }
  return plan
}

/** A set as its pictures see it: stored, or added by this run, which has no picture yet. */
export type PicturedSet = {
  setId: string
  name: string
  position: number
  pictures: Record<SetPictureField, PictureState>
}

/** The sets after the import, in their order: the stored ones, then the added ones. */
export function setsAfter(stored: readonly StoredSet[], plan: SetPlan): PicturedSet[] {
  const never: PictureState = { kind: 'never' }
  return [
    ...stored,
    ...plan.added.map(({ setId, name, position }) => ({
      setId,
      name,
      position,
      pictures: { cardback: never, mascot: never },
    })),
  ]
}

/** The sets after the import as the picture matching takes them: by code, official name or alias. */
export function setArtData(stored: readonly StoredSet[], plan: SetPlan): ArtData {
  const sets: ArtSet[] = [
    ...stored.map(({ setId, code, name, aliases }) => ({ setId, code, name, aliases })),
    ...plan.added.map(({ setId, code, name, aliases }) => ({ setId, code, name, aliases })),
  ]
  return { ...NO_DEFINITIONS, sets }
}

/** What the import does for a matched picture: give it, or leave the set's own alone. */
export type SetPictureOutcome = 'add' | 'has' | 'removed'

export type PlannedSetPicture<F extends ArtFile> = {
  set: PicturedSet
  field: SetPictureField
  file: F
  outcome: SetPictureOutcome
}

export type SetPicturePlan<F extends ArtFile> = {
  /** The matching, with its duplicates, the files that match no set, and the files left to the other scripts. */
  art: ArtPlan<F>
  /** One per matched picture, in the sets' order, the cardback first. */
  pictures: PlannedSetPicture<F>[]
  /** Per field, the sets that will have no such picture after the run, removed ones included. */
  without: Record<SetPictureField, PicturedSet[]>
}

export type SetImportPlan<F extends ArtFile> = {
  sets: SetPlan
  /** `null` without an archive folder. */
  pictures: SetPicturePlan<F> | null
}

const FIELD_OF_GROUP = { setBack: 'cardback', setMascot: 'mascot' } as const

/**
 * Matches the files to the sets after the import and decides each picture's outcome (spec: admin-scripts, "Set
 * pictures from the archives"): a set that never had the picture gets it; one with it, or whose picture the DM
 * removed, is left alone. Pure.
 */
export function planSetPictures<F extends ArtFile>(
  files: readonly F[],
  aliases: readonly ArtAlias[],
  stored: readonly StoredSet[],
  sets: SetPlan,
): SetPicturePlan<F> {
  const art = planArt(files, setArtData(stored, sets), aliases, 'sets')
  const after = setsAfter(stored, sets)
  const byId = new Map(after.map((set) => [set.setId, set]))
  const pictures = art.assignments
    .flatMap(({ target, file }): PlannedSetPicture<F>[] => {
      const set = byId.get(target.key)
      if (set === undefined || (target.group !== 'setBack' && target.group !== 'setMascot')) {
        return []
      }
      const field = FIELD_OF_GROUP[target.group]
      const state = set.pictures[field]
      const outcome: SetPictureOutcome =
        state.kind === 'never' ? 'add' : state.kind === 'removed' ? 'removed' : 'has'
      return [{ set, field, file, outcome }]
    })
    .sort(
      (a, b) =>
        byPosition(a.set, b.set) ||
        SET_PICTURE_FIELDS.indexOf(a.field) - SET_PICTURE_FIELDS.indexOf(b.field),
    )
  const adding = new Set(
    pictures
      .filter(({ outcome }) => outcome === 'add')
      .map(({ set, field }) => `${field}:${set.setId}`),
  )
  const without = Object.fromEntries(
    SET_PICTURE_FIELDS.map((field) => [
      field,
      after.filter(
        (set) => set.pictures[field].kind !== 'stored' && !adding.has(`${field}:${set.setId}`),
      ),
    ]),
  ) as Record<SetPictureField, PicturedSet[]>
  return { art, pictures, without }
}

/** Plans a set import: the sets, and with the archive's files their pictures. Pure. */
export function planSetImport<F extends ArtFile>(
  rows: readonly SetRow[],
  stored: readonly StoredSet[],
  source: { files: readonly F[]; aliases: readonly ArtAlias[] } | null,
): SetImportPlan<F> {
  const sets = planSets(rows, stored)
  return {
    sets,
    pictures: source ? planSetPictures(source.files, source.aliases, stored, sets) : null,
  }
}

export type WriteSetsOptions = {
  /** Converts a picture file; `convertPicture` unless a test gives another. */
  convert?: (path: string, field: SetPictureField) => Promise<Buffer>
  onProgress?: (done: number, total: number) => void
}

export type SetImportWritten = {
  /** The sets added. */
  added: NewSet[]
  /** The pictures stored and set on their sets. */
  pictured: { set: PicturedSet; field: SetPictureField }[]
  /** The pictures given elsewhere meanwhile: the set's was kept, and the upload deleted. */
  changedMeanwhile: { set: PicturedSet; field: SetPictureField }[]
  /** The record of the run; `null` when it changed nothing. */
  recordId: string | null
}

/** How many pictures are converted and stored at once. */
const PARALLEL = 4

/**
 * Writes a planned set import: creates the added sets (never overwriting one), stores each planned picture and sets
 * it on its set while the field is still absent (checked in a transaction; otherwise the upload is deleted again), and
 * then writes one `imported` record (spec: admin-scripts, "A set import is recorded"), also when a failure stops the run
 * halfway: the error is thrown after it, and running the import again adds the rest. The added sets point at that
 * record. A run that changes nothing writes no record.
 */
export async function writeSetImport<F extends SourceFile>(
  db: Firestore,
  store: PictureFileStore,
  plan: SetImportPlan<F>,
  {
    convert = (path, field) => convertPicture(path, field === 'mascot'),
    onProgress,
  }: WriteSetsOptions = {},
): Promise<SetImportWritten> {
  const record = db.collection(SET_CHANGES_COLLECTION).doc()
  const result: SetImportWritten = {
    added: [],
    pictured: [],
    changedMeanwhile: [],
    recordId: null,
  }
  try {
    for (let start = 0; start < plan.sets.added.length; start += BATCH_SIZE) {
      const chunk = plan.sets.added.slice(start, start + BATCH_SIZE)
      const batch = db.batch()
      for (const { setId, code, name, aliases, position, packLayout } of chunk) {
        // No picture fields: an absent field means the set never had a picture, so the import may give one.
        batch.create(db.collection(SETS_COLLECTION).doc(setId), {
          code,
          name,
          aliases,
          position,
          packLayout,
          changeId: record.id,
        })
      }
      await batch.commit()
      result.added.push(...chunk)
    }

    const todo = (plan.pictures?.pictures ?? []).filter(({ outcome }) => outcome === 'add')
    let done = 0
    const give = async ({ set, field, file }: PlannedSetPicture<F>) => {
      const bytes = await convert(file.path, field)
      const path = `${PICTURE_FOLDER}/${set.setId}/${contentHash(bytes)}.webp`
      await store.save(path, bytes, `${set.setId}-${DOWNLOAD_SUFFIX[field]}.webp`)
      const ref = db.collection(SETS_COLLECTION).doc(set.setId)
      const isSet = await db.runTransaction(async (transaction) => {
        const data = (await transaction.get(ref)).data()
        if (data === undefined || field in data) return false
        transaction.update(ref, { [field]: path })
        return true
      })
      if (isSet) {
        result.pictured.push({ set, field })
      } else {
        await store.remove(path)
        result.changedMeanwhile.push({ set, field })
      }
      onProgress?.(++done, todo.length)
    }
    for (let start = 0; start < todo.length; start += PARALLEL) {
      const outcomes = await Promise.allSettled(todo.slice(start, start + PARALLEL).map(give))
      const failure = outcomes.find((outcome) => outcome.status === 'rejected')
      if (failure) throw failure.reason
    }
  } finally {
    if (result.added.length > 0 || result.pictured.length > 0) {
      await record.set(setImportRecord(result))
      result.recordId = record.id
    }
  }
  return result
}

/** The names of the sets that got at least one picture, in the sets' order. */
function picturedNames(pictured: SetImportWritten['pictured']): string[] {
  const sets = new Map(pictured.map(({ set }) => [set.setId, set]))
  return [...sets.values()].sort(byPosition).map(({ name }) => name)
}

/** The `imported` record of a set import (design D3): the added sets and the sets that got a picture, by name. */
export function setImportRecord(written: Pick<SetImportWritten, 'added' | 'pictured'>) {
  return {
    by: null,
    at: FieldValue.serverTimestamp(),
    step: 'imported',
    setId: null,
    code: null,
    name: null,
    fields: [],
    direction: null,
    added: written.added.map(({ name }) => name),
    pictured: picturedNames(written.pictured),
  }
}

export type SetImportResult<F extends ArtFile> = {
  plan: SetImportPlan<F>
  /** `null` for a dry run. */
  written: SetImportWritten | null
}

/** Plans the import against the stored sets and, unless this is a dry run, writes it. */
export async function runSetImport<F extends SourceFile>(
  db: Firestore,
  store: PictureFileStore,
  rows: readonly SetRow[],
  stored: readonly StoredSet[],
  source: { files: readonly F[]; aliases: readonly ArtAlias[] } | null,
  { dryRun = false, ...options }: WriteSetsOptions & { dryRun?: boolean } = {},
): Promise<SetImportResult<F>> {
  const plan = planSetImport(rows, stored, source)
  if (dryRun) return { plan, written: null }
  return { plan, written: await writeSetImport(db, store, plan, options) }
}

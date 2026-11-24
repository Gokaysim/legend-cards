import { FieldValue, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { Storage } from 'firebase-admin/storage'

import {
  type ArtAlias,
  type ArtAssignment,
  type ArtData,
  type ArtFile,
  type ArtPlan,
  planArt,
} from './artFiles.ts'
import { contentHash, convertPicture, type SourceFile } from './artWrite.ts'
import { CARDS_COLLECTION, CHANGES_COLLECTION, type DefinitionStatus } from './importCards.ts'
import type { CardKind } from './cardRows.ts'

// The picture import (design D9 of upload-card-and-word-pictures): the owner's card and True Word pictures, matched
// against the stored definitions, converted as the build converts them, stored in Cloud Storage, and set on the
// definitions that never had a picture. It only adds: a picture the DM uploaded or removed is never touched. The set
// pictures are the set import's (`importSets.ts`), and the cardbacks, packs and Cardmaker the build's.

/** A stored definition's picture (design D3): no field, `null` (the DM removed it), or the path of its picture. */
export type PictureState =
  { kind: 'never' } | { kind: 'removed' } | { kind: 'stored'; path: string }

/** A stored card or True Word, as the picture import sees it. */
export type PictureDefinition = {
  target: 'card' | 'word'
  id: string
  /** A card's kind; `null` for a word. */
  kind: CardKind | null
  name: string
  nameKey: string
  status: DefinitionStatus
  /** "Listede görünür" (spec: definition-editing, "Behavior flags"): off hides the definition from players. */
  isInLibrary: boolean
  picture: PictureState
}

/** What the import does for a matched definition: give it the picture, or leave its own alone. */
export type PictureOutcome = 'add' | 'has' | 'removed'

export type PlannedPicture<F extends ArtFile> = {
  definition: PictureDefinition
  file: F
  outcome: PictureOutcome
}

export type PicturePlan<F extends ArtFile> = {
  /** The matching, with its duplicates, unknown files and the files left to the build and the set import. */
  art: ArtPlan<F>
  /** One per matched definition, in the report's order. */
  pictures: PlannedPicture<F>[]
  /** The stored definitions that will have no picture after the run, removed ones included. */
  withoutPicture: PictureDefinition[]
}

/** The Cloud Storage folder of each target. Keep in step with `src/features/definitions/picturePath.ts`. */
const FOLDERS = { card: 'cards', word: 'words' } as const

const STATUSES: readonly DefinitionStatus[] = ['draft', 'active', 'retired']

function pictureStateOf(data: Record<string, unknown>): PictureState {
  if (!('picture' in data)) return { kind: 'never' }
  return typeof data.picture === 'string'
    ? { kind: 'stored', path: data.picture }
    : { kind: 'removed' }
}

/** A stored definition's status; one from before statuses reads as the import's upgrade would give it. */
function statusOf(data: Record<string, unknown>): DefinitionStatus {
  const status = data.status as DefinitionStatus
  if (STATUSES.includes(status)) return status
  return data.retired === true ? 'retired' : 'active'
}

/**
 * Every stored card and True Word, whatever its status. Both are in the cards collection (design D1 of
 * unify-cards-and-true-words): a definition of the kind `trueWord` is a word. A Custom Card (`custom`) has no picture
 * of its own (design D6 of add-custom-card-draft), so it is left out.
 */
export async function readPictureDefinitions(db: Firestore): Promise<PictureDefinition[]> {
  const snapshot = await db.collection(CARDS_COLLECTION).get()
  const definitions = snapshot.docs.filter((document) => document.data().kind !== 'custom')
  return definitions.map((document: QueryDocumentSnapshot): PictureDefinition => {
    const data = document.data()
    const isWord = data.kind === 'trueWord'
    return {
      target: isWord ? 'word' : 'card',
      id: document.id,
      kind: isWord ? null : (data.kind as CardKind),
      name: String(data.name),
      nameKey: String(data.nameKey),
      status: statusOf(data),
      isInLibrary: data.isInLibrary !== false,
      picture: pictureStateOf(data),
    }
  })
}

/** The definitions as the picture matching takes them. */
export function artDataOf(definitions: readonly PictureDefinition[]): ArtData {
  const cards = (deck: 'legend-' | 'cursed-') =>
    definitions
      .filter(({ target, id }) => target === 'card' && id.startsWith(deck))
      .map(({ id, kind, name, nameKey }) => ({ id, kind: kind ?? 'normal', name, nameKey }))
  return {
    legend: cards('legend-'),
    cursed: cards('cursed-'),
    words: definitions
      .filter(({ target }) => target === 'word')
      .map(({ id, name, nameKey }) => ({ id, name, nameKey })),
    sets: [],
  }
}

/**
 * Matches the files to the stored definitions and decides each one's outcome (spec: admin-scripts, "The picture import
 * only adds"): a definition that never had a picture gets one; one with a picture, or whose picture the DM removed,
 * is left alone. Pure.
 */
export function planPictures<F extends ArtFile>(
  files: readonly F[],
  definitions: readonly PictureDefinition[],
  aliases: readonly ArtAlias[],
): PicturePlan<F> {
  const art = planArt(files, artDataOf(definitions), aliases, 'definitions')
  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  const pictures = art.assignments.flatMap(
    ({ target, file }: ArtAssignment<F>): PlannedPicture<F>[] => {
      const definition = byId.get(target.key)
      if (definition === undefined) return []
      const outcome: PictureOutcome =
        definition.picture.kind === 'never'
          ? 'add'
          : definition.picture.kind === 'removed'
            ? 'removed'
            : 'has'
      return [{ definition, file, outcome }]
    },
  )
  const adding = new Set(
    pictures.filter(({ outcome }) => outcome === 'add').map(({ definition }) => definition.id),
  )
  const withoutPicture = definitions
    .filter((definition) => definition.picture.kind !== 'stored' && !adding.has(definition.id))
    .sort((a, b) => a.target.localeCompare(b.target) || a.name.localeCompare(b.name, 'en'))
  return { art, pictures, withoutPicture }
}

/** Where the import stores picture files. */
export type PictureFileStore = {
  /** Stores a picture at `path`. `downloadName` is the file name "İndir" saves it under. */
  save: (path: string, bytes: Buffer, downloadName: string) => Promise<void>
  /** Deletes the file at `path`; a missing file is not an error. */
  remove: (path: string) => Promise<void>
}

/** The pictures in the target's bucket, with the metadata the app gives its uploads (`pictureMetadata` there). */
export function bucketPictureStore(storage: Storage): PictureFileStore {
  const bucket = storage.bucket()
  return {
    save: async (path, bytes, downloadName) => {
      await bucket.file(path).save(bytes, {
        resumable: false,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
          contentDisposition: `attachment; filename="${downloadName}"`,
        },
      })
    },
    remove: async (path) => {
      await bucket.file(path).delete({ ignoreNotFound: true })
    },
  }
}

export type WritePicturesOptions = {
  /** Converts a picture file; `convertPicture` unless a test gives another. */
  convert?: (path: string) => Promise<Buffer>
  onProgress?: (done: number, total: number) => void
}

export type WritePicturesResult = {
  /** The definitions that got their picture. */
  added: PictureDefinition[]
  /** The definitions that got a picture elsewhere meanwhile: theirs was kept, and the upload deleted. */
  changedMeanwhile: PictureDefinition[]
}

/** How many pictures are converted and stored at once. */
const PARALLEL = 4

/**
 * Stores each planned picture and sets it on its definition, a few at a time. A definition gets the picture only while
 * it still has no `picture` field, checked in a transaction; otherwise the upload is deleted again. Then it writes the
 * records of what was added (spec: admin-scripts, "Picture import records"), also when a failure stops the run
 * halfway: the error is thrown after them, and running the import again adds the rest.
 */
export async function writePictures<F extends SourceFile>(
  db: Firestore,
  store: PictureFileStore,
  plan: PicturePlan<F>,
  { convert = (path) => convertPicture(path, false), onProgress }: WritePicturesOptions = {},
): Promise<WritePicturesResult> {
  const todo = plan.pictures.filter(({ outcome }) => outcome === 'add')
  const result: WritePicturesResult = { added: [], changedMeanwhile: [] }
  let done = 0

  const give = async ({ definition, file }: PlannedPicture<F>) => {
    const bytes = await convert(file.path)
    const path = `${FOLDERS[definition.target]}/${definition.id}/${contentHash(bytes)}.webp`
    await store.save(path, bytes, `${definition.id}.webp`)
    const ref = db.collection(CARDS_COLLECTION).doc(definition.id)
    const isSet = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref)
      const data = snapshot.data()
      if (data === undefined || 'picture' in data) return false
      transaction.update(ref, { picture: path })
      return true
    })
    if (isSet) {
      result.added.push(definition)
    } else {
      await store.remove(path)
      result.changedMeanwhile.push(definition)
    }
    onProgress?.(++done, todo.length)
  }

  try {
    for (let start = 0; start < todo.length; start += PARALLEL) {
      const outcomes = await Promise.allSettled(todo.slice(start, start + PARALLEL).map(give))
      const failure = outcomes.find((outcome) => outcome.status === 'rejected')
      if (failure) throw failure.reason
    }
  } finally {
    await writePictureRecords(db, result.added)
  }
  return result
}

/**
 * Which record of a picture import names a definition: the public one, the drafts', or the hidden definitions' (those
 * whose "Listede görünür" is off).
 */
type PictureRecordGroup = 'public' | 'drafts' | 'hidden'

function recordGroupOf(definition: PictureDefinition): PictureRecordGroup {
  if (definition.status === 'draft') return 'drafts'
  return definition.isInLibrary ? 'public' : 'hidden'
}

/** One record a picture import writes: its target, whether players read it, and the definitions it names. */
export type PictureRecord = {
  target: 'card' | 'word'
  isPublic: boolean
  items: PictureDefinition[]
}

/**
 * Up to six records of a picture import: for cards and for words, one public of the active and retired definitions
 * listed for players that got a picture, one DM-only of the drafts, and one DM-only of the hidden definitions that are
 * not drafts (design D7 of unify-cards-and-true-words). None when nothing was added.
 */
export function pictureRecords(added: readonly PictureDefinition[]): PictureRecord[] {
  return (['card', 'word'] as const)
    .flatMap((target) =>
      (['public', 'drafts', 'hidden'] as const).map((group) => ({
        target,
        isPublic: group === 'public',
        items: added.filter(
          (definition) => definition.target === target && recordGroupOf(definition) === group,
        ),
      })),
    )
    .filter((record) => record.items.length > 0)
}

/** Writes the records of a picture import (`pictureRecords`) in one batch. */
export async function writePictureRecords(
  db: Firestore,
  added: readonly PictureDefinition[],
): Promise<void> {
  const groups = pictureRecords(added)
  const batch = db.batch()
  let count = 0
  for (const { target, isPublic, items } of groups) {
    batch.set(db.collection(CHANGES_COLLECTION).doc(), {
      target,
      step: 'imported',
      what: 'pictures',
      items: items.map(({ id, name, status, isInLibrary }) => ({ id, name, status, isInLibrary })),
      public: isPublic,
      by: null,
      at: FieldValue.serverTimestamp(),
    })
    count++
  }
  if (count > 0) await batch.commit()
}

export type PictureImportResult<F extends ArtFile> = {
  plan: PicturePlan<F>
  /** `null` for a dry run. */
  written: WritePicturesResult | null
}

/** Plans the import against the stored definitions and, unless this is a dry run, writes it. */
export async function runPictureImport<F extends SourceFile>(
  db: Firestore,
  store: PictureFileStore,
  files: readonly F[],
  aliases: readonly ArtAlias[],
  definitions: readonly PictureDefinition[],
  { dryRun = false, ...options }: WritePicturesOptions & { dryRun?: boolean } = {},
): Promise<PictureImportResult<F>> {
  const plan = planPictures(files, definitions, aliases)
  if (dryRun) return { plan, written: null }
  return { plan, written: await writePictures(db, store, plan, options) }
}

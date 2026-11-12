import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'

import { type ArtAssignment, type ArtFile, SECTION_OF_GROUP } from './artFiles.ts'

// Converting the planned pictures and writing them with their manifest (design D1, steps 6 and 7; D4 of
// add-card-images). Since upload-card-and-word-pictures the build writes only the cardbacks, packs and Cardmaker; the
// card and True Word pictures go to Cloud Storage (`importPictures.ts`), converted the same way (`convertPicture`).

/** The manifest format. Keep in step with `src/features/art/schema.ts`. */
export const MANIFEST_VERSION = 1

/** The manifest's sections: the built pictures. */
export type ManifestSection = 'cardbacks' | 'packs' | 'mascots'

export type ArtManifest = { version: typeof MANIFEST_VERSION } & Record<
  ManifestSection,
  Record<string, string>
>

/** The manifest's file name in the picture folder. */
export const MANIFEST_FILE = 'manifest.json'

/** WebP quality for every picture. */
export const WEBP_QUALITY = 82

/** The Cardmaker pictures are about 1240 px high; the app never shows them above this. */
export const MASCOT_MAX_HEIGHT = 480

/** The URL the picture folder is served at: Vite serves `public/` at the root, and Hosting serves `dist/`. */
export const ART_URL_BASE = '/art/'

/** Each section's folder under the picture folder. */
const SECTION_FOLDERS: Readonly<Record<ManifestSection, string>> = {
  cardbacks: 'backs',
  packs: 'packs',
  mascots: 'mascots',
}

const isManifestSection = (section: string): section is ManifestSection =>
  section in SECTION_FOLDERS

/** A picture file on disk: its name for the plan, and where it is. */
export type SourceFile = ArtFile & { path: string }

/** The first 10 hex digits of the SHA-256 of the bytes: a changed picture gets a new address. */
export function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 10)
}

/** A key as a file name: "mechanic:Gambler's Gambit" becomes "mechanic-gambler-s-gambit". */
export function fileSlug(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * One picture as WebP: cards, backs, packs and words at their own size, a Cardmaker shrunk to at most
 * `MASCOT_MAX_HEIGHT` pixels high. Transparency is kept.
 */
export async function convertPicture(path: string, isMascot: boolean): Promise<Buffer> {
  const image = sharp(path)
  if (isMascot) image.resize({ height: MASCOT_MAX_HEIGHT, withoutEnlargement: true })
  return image.webp({ quality: WEBP_QUALITY }).toBuffer()
}

const emptyManifest = (): ArtManifest => ({
  version: MANIFEST_VERSION,
  cardbacks: {},
  packs: {},
  mascots: {},
})

/** Runs `work` on every item, at most `limit` at a time, keeping the results in order. */
async function inPool<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export type WriteArtOptions = {
  /** Called after each picture is written, for the progress line. */
  onProgress?: (done: number, total: number) => void
}

/**
 * Empties `outDir`, converts each assigned picture into `<section folder>/<key>.<hash>.webp`, and writes the
 * manifest last: a build that fails halfway leaves no manifest, so the app keeps its CSS look. Returns the manifest.
 * Every assignment must be a cardback, a pack or a Cardmaker: card and word pictures are not built.
 */
export async function writeArt(
  assignments: readonly ArtAssignment<SourceFile>[],
  outDir: string,
  { onProgress }: WriteArtOptions = {},
): Promise<ArtManifest> {
  await rm(outDir, { recursive: true, force: true })
  for (const folder of Object.values(SECTION_FOLDERS)) {
    await mkdir(join(outDir, folder), { recursive: true })
  }

  let done = 0
  const written = await inPool(
    assignments,
    Math.max(2, Math.floor(availableParallelism() / 2)),
    async ({ target, file }) => {
      const section = SECTION_OF_GROUP[target.group]
      if (!isManifestSection(section)) throw new Error(`Not a built picture: ${target.label}`)
      const bytes = await convertPicture(file.path, section === 'mascots')
      const name = `${fileSlug(target.key)}.${contentHash(bytes)}.webp`
      await writeFile(join(outDir, SECTION_FOLDERS[section], name), bytes)
      onProgress?.(++done, assignments.length)
      return { section, key: target.key, url: `${ART_URL_BASE}${SECTION_FOLDERS[section]}/${name}` }
    },
  )

  const manifest = emptyManifest()
  for (const { section, key, url } of written) manifest[section][key] = url
  await writeFile(join(outDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

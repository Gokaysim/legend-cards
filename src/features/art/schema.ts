import { z } from 'zod'

// The picture manifest that `npm run build-art` writes to `public/art/manifest.json` (design D4). Keep in step with
// `scripts/lib/artWrite.ts`.

/** A picture's address, as the build writes it: a path under `/art/`. */
const pictureUrl = z.string().startsWith('/art/')
const pictures = z.record(z.string(), pictureUrl)

export const artManifestSchema = z.object({
  version: z.literal(1),
  /** By card document ID, for example `legend-abolethseyes`. */
  cards: pictures,
  /** By True Word document ID, for example `tw-abyss`. */
  words: pictures,
  /** By set code, `blessed` or `cursed`. */
  cardbacks: pictures,
  /** By `PackDef.key`, for example `mechanic:Blood & Battle` or `golden`. */
  packs: pictures,
  /** By Cardmaker stem, for example `cardmaker_lib`. */
  mascots: pictures,
})

export type ArtManifest = z.infer<typeof artManifestSchema>

/** No pictures: what the app uses where none are built, and in every test that gives none. */
export const EMPTY_ART: ArtManifest = {
  version: 1,
  cards: {},
  words: {},
  cardbacks: {},
  packs: {},
  mascots: {},
}

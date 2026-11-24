import { z } from 'zod'

// The picture manifest that `npm run build-art` writes to `public/art/manifest.json` (design D4 of add-card-images):
// the cardbacks, pack pictures, Cardmaker, and the Custom Card covers and effect pictures. Card and True Word pictures are in Cloud Storage instead, found through
// their definitions (design D4 of upload-card-and-word-pictures); a manifest from an older build still lists them,
// and those sections are ignored. Keep in step with `scripts/lib/artWrite.ts`.

/** A picture's address, as the build writes it: a path under `/art/`. */
const pictureUrl = z.string().startsWith('/art/')
const pictures = z.record(z.string(), pictureUrl)

export const artManifestSchema = z.object({
  version: z.literal(1),
  /** By set code, `blessed` or `cursed`. */
  cardbacks: pictures,
  /** By `PackDef.key`, for example `mechanic:Blood & Battle` or `golden`. */
  packs: pictures,
  /** By Cardmaker stem, for example `cardmaker_lib`. */
  mascots: pictures,
  /** The Custom Card covers, by draft cost: `'1'`, `'3'`, `'5'`. Missing from a manifest built before them. */
  customCovers: pictures.default({}),
  /** The custom effect pictures, by `'<cost>:<Type>'`, for example `'3:Caster'`. Missing from an older manifest. */
  customEffects: pictures.default({}),
})

export type ArtManifest = z.infer<typeof artManifestSchema>

/** No pictures: what the app uses where none are built, and in every test that gives none. */
export const EMPTY_ART: ArtManifest = {
  version: 1,
  cardbacks: {},
  packs: {},
  mascots: {},
  customCovers: {},
  customEffects: {},
}

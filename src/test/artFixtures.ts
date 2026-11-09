import { type ArtManifest, EMPTY_ART } from '@/features/art/schema'

/** A manifest for tests: the given sections, the others empty. */
export function testArt(sections: Partial<Omit<ArtManifest, 'version'>>): ArtManifest {
  return { ...EMPTY_ART, ...sections }
}

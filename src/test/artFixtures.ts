import { type ArtManifest, EMPTY_ART } from '@/features/art/schema'
import { picturePath, type PictureTarget } from '@/features/definitions/picturePath'

/** A manifest for tests: the given sections, the others empty. */
export function testArt(sections: Partial<Omit<ArtManifest, 'version'>>): ArtManifest {
  return { ...EMPTY_ART, ...sections }
}

/** How the test providers turn a stored picture's path into an address. */
export function testPictureUrl(path: string): string {
  return `/stored/${path}`
}

/** A stored picture's path for a test card or word, with a fixed hash. */
export function testPicturePath(target: PictureTarget, id: string): string {
  return picturePath(target, id, '0123456789')
}

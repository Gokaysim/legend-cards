/** Where the stored pictures are served from: the bucket, and the Storage emulator's origin when it is used. */
export type PictureLocation = {
  bucket: string
  /** For example `http://127.0.0.1:9199`; `null` for the real Cloud Storage. */
  emulatorOrigin: string | null
}

const CLOUD_STORAGE_ORIGIN = 'https://firebasestorage.googleapis.com'

/**
 * The address of a stored picture (design D4 of upload-card-and-word-pictures). `storage.rules` let anyone read the
 * card and word pictures, so the plain download address needs no token and no request to build: one image request
 * per picture, and nothing else.
 */
export function pictureAddress(location: PictureLocation, path: string): string {
  const origin = location.emulatorOrigin ?? CLOUD_STORAGE_ORIGIN
  return `${origin}/v0/b/${encodeURIComponent(location.bucket)}/o/${encodeURIComponent(path)}?alt=media`
}

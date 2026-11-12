import { deleteObject, type FirebaseStorage, ref, uploadBytes } from 'firebase/storage'

// Storing and deleting picture files in Cloud Storage (design D2, D6 of upload-card-and-word-pictures). The steps in
// `api.ts` use this through `PictureStore`, so the order around the definition's transaction stays in one place.

/** Where the steps store and delete picture files. */
export type PictureStore = {
  /** Stores a picture at `path`. `downloadName` is the file name "İndir" saves it under. */
  upload: (path: string, blob: Blob, downloadName: string) => Promise<void>
  /** Deletes the file at `path`. */
  remove: (path: string) => Promise<void>
}

/**
 * A stored picture's metadata. The content hash in the file name makes it immutable, so browsers keep it for a year.
 * `Content-Disposition` makes a plain link to it download the file under the definition's ID (design D8); an `<img>`
 * ignores it.
 */
export function pictureMetadata(downloadName: string) {
  return {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
    contentDisposition: `attachment; filename="${downloadName}"`,
  }
}

/** The picture files in a Cloud Storage bucket. */
export function cloudPictureStore(storage: FirebaseStorage): PictureStore {
  return {
    upload: async (path, blob, downloadName) => {
      await uploadBytes(ref(storage, path), blob, pictureMetadata(downloadName))
    },
    remove: (path) => deleteObject(ref(storage, path)),
  }
}

/** No store: every call fails. The default for steps that are not given one, which then never touch a picture. */
export const NO_PICTURE_STORE: PictureStore = {
  upload: () => Promise.reject(new Error('No picture store')),
  remove: () => Promise.reject(new Error('No picture store')),
}

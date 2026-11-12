import { PICTURE_HEIGHT, PICTURE_WIDTH } from '@/features/art/CardPicture'

import {
  PictureTooLargeError,
  PictureTypeError,
  PictureUnreadableError,
  PictureUnsupportedError,
} from './errors'

// Preparing a card's or True Word's picture on the DM's device (design D7 of upload-card-and-word-pictures): a PNG,
// JPEG or WebP file becomes a WebP of at most 563 × 788 pixels, at the picture build's quality. It must work in
// Chrome; a browser that cannot encode WebP gets `PictureUnsupportedError`.

/** The files the form accepts, as the file input's `accept` lists them. */
export const PICTURE_INPUT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** The largest file the form accepts. */
export const PICTURE_INPUT_MAX_BYTES = 20 * 1024 * 1024

/** The largest prepared picture. Keep in step with `validPicture` in `storage.rules`. */
export const PICTURE_MAX_BYTES = 1024 * 1024

/** The WebP quality of `npm run build-art` and `npm run import-pictures` (`WEBP_QUALITY` there, 82). */
export const PICTURE_QUALITY = 0.82

export type PictureSize = { width: number; height: number }

/** A picture ready to upload: the WebP file, its content hash for the file name, and its size. */
export type PreparedPicture = PictureSize & { blob: Blob; hash: string }

/**
 * How a picture is decoded and encoded. The browser's own is `browserCodec`; tests inject a fake, because jsdom has
 * no canvas.
 */
export type PictureCodec = {
  /** The picture's natural size. Throws when it cannot be decoded. */
  sizeOf: (file: Blob) => Promise<PictureSize>
  /** The picture scaled to `size` and encoded as WebP, or whatever the browser makes of that request. */
  encode: (file: Blob, size: PictureSize, quality: number) => Promise<Blob>
}

/** The size that fits within 563 × 788 pixels with the proportions kept. A smaller picture is never enlarged. */
export function fitWithin({ width, height }: PictureSize): PictureSize {
  const scale = Math.min(1, PICTURE_WIDTH / width, PICTURE_HEIGHT / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** The first 10 hex digits of the SHA-256 of the file, as the picture build's `contentHash` gives them. */
export async function pictureHash(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 10)
}

/** Chrome's way: `createImageBitmap` scales with high quality, and an `OffscreenCanvas` encodes WebP. */
export const browserCodec: PictureCodec = {
  async sizeOf(file) {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  },
  async encode(file, size, quality) {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: 'high',
    })
    try {
      const canvas = new OffscreenCanvas(size.width, size.height)
      const context = canvas.getContext('2d')
      if (context === null) throw new PictureUnsupportedError()
      context.drawImage(bitmap, 0, 0)
      return await canvas.convertToBlob({ type: 'image/webp', quality })
    } finally {
      bitmap.close()
    }
  },
}

/** True when this browser has what `browserCodec` needs. */
function canPrepare(): boolean {
  return typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function'
}

/**
 * Prepares the chosen file as a stored picture (spec: definition-editing, "Preparing a picture"; card-images,
 * "Converted pictures"). Throws `PictureTypeError`, `PictureTooLargeError`, `PictureUnreadableError` and
 * `PictureUnsupportedError`.
 */
export async function preparePicture(
  file: Blob,
  codec: PictureCodec = browserCodec,
): Promise<PreparedPicture> {
  if (!(PICTURE_INPUT_TYPES as readonly string[]).includes(file.type)) throw new PictureTypeError()
  if (file.size > PICTURE_INPUT_MAX_BYTES) throw new PictureTooLargeError('file')
  if (codec === browserCodec && !canPrepare()) throw new PictureUnsupportedError()

  let natural: PictureSize
  try {
    natural = await codec.sizeOf(file)
  } catch {
    throw new PictureUnreadableError()
  }
  const size = fitWithin(natural)
  const blob = await codec.encode(file, size, PICTURE_QUALITY)
  // A browser that cannot encode WebP answers with a PNG instead (Safari).
  if (blob.type !== 'image/webp') throw new PictureUnsupportedError()
  if (blob.size > PICTURE_MAX_BYTES) throw new PictureTooLargeError('picture')
  return { blob, hash: await pictureHash(blob), ...size }
}

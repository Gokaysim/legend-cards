import { describe, expect, it, vi } from 'vitest'

import {
  pictureErrorMessage,
  PictureTooLargeError,
  PictureTypeError,
  PictureUnreadableError,
  PictureUnsupportedError,
} from './errors'
import {
  fitWithin,
  type PictureCodec,
  pictureHash,
  PICTURE_INPUT_MAX_BYTES,
  PICTURE_MAX_BYTES,
  PICTURE_QUALITY,
  preparePicture,
} from './picture'

/** A file of `size` bytes with a type, without real picture content: the fake codec never decodes it. */
const fileOf = (type: string, size = 64) => new Blob([new Uint8Array(size)], { type })

/** A codec that reports `natural` as the picture's size and answers with a blob of `type` and `size` bytes. */
function fakeCodec({
  natural = { width: 1126, height: 1576 },
  type = 'image/webp',
  size = 2048,
}: { natural?: { width: number; height: number }; type?: string; size?: number } = {}) {
  return {
    sizeOf: vi.fn<PictureCodec['sizeOf']>(() => Promise.resolve(natural)),
    encode: vi.fn<PictureCodec['encode']>(() =>
      Promise.resolve(new Blob([new Uint8Array(size).fill(1)], { type })),
    ),
  }
}

describe('fitWithin', () => {
  it.each([
    [
      { width: 1126, height: 1576 },
      { width: 563, height: 788 },
    ],
    [
      { width: 400, height: 560 },
      { width: 400, height: 560 },
    ],
    [
      { width: 563, height: 788 },
      { width: 563, height: 788 },
    ],
    // A wide picture keeps its ratio: its width decides.
    [
      { width: 1600, height: 800 },
      { width: 563, height: 282 },
    ],
    // A tall picture: its height decides.
    [
      { width: 500, height: 2000 },
      { width: 197, height: 788 },
    ],
  ])('fits %o into %o', (natural, fitted) => {
    expect(fitWithin(natural)).toEqual(fitted)
  })
})

describe('pictureHash', () => {
  it('gives the first 10 hex digits of the SHA-256 of the file', async () => {
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    await expect(pictureHash(new Blob(['abc']))).resolves.toBe('ba7816bf8f')
  })
})

describe('preparePicture', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])(
    'prepares a %s file as a fitted WebP with its hash',
    async (type) => {
      const codec = fakeCodec()
      const picture = await preparePicture(fileOf(type), codec)

      expect(picture).toMatchObject({ width: 563, height: 788 })
      expect(picture.blob.type).toBe('image/webp')
      expect(picture.hash).toMatch(/^[0-9a-f]{10}$/)
      expect(codec.encode).toHaveBeenCalledWith(
        expect.any(Blob),
        { width: 563, height: 788 },
        PICTURE_QUALITY,
      )
    },
  )

  it.each(['application/pdf', 'image/gif', 'image/svg+xml', ''])(
    'refuses a %s file',
    async (type) => {
      const codec = fakeCodec()
      await expect(preparePicture(fileOf(type), codec)).rejects.toBeInstanceOf(PictureTypeError)
      expect(codec.sizeOf).not.toHaveBeenCalled()
    },
  )

  it('refuses a file over 20 MB', async () => {
    await expect(
      preparePicture(fileOf('image/png', PICTURE_INPUT_MAX_BYTES + 1), fakeCodec()),
    ).rejects.toEqual(new PictureTooLargeError('file'))
  })

  it('refuses a file the browser cannot decode', async () => {
    const codec = fakeCodec()
    codec.sizeOf.mockRejectedValue(new DOMException('broken', 'InvalidStateError'))
    await expect(preparePicture(fileOf('image/png'), codec)).rejects.toBeInstanceOf(
      PictureUnreadableError,
    )
  })

  it('refuses a browser that answers with a PNG instead of a WebP', async () => {
    await expect(
      preparePicture(fileOf('image/png'), fakeCodec({ type: 'image/png' })),
    ).rejects.toBeInstanceOf(PictureUnsupportedError)
  })

  it('refuses a prepared picture over 1 MB', async () => {
    await expect(
      preparePicture(fileOf('image/png'), fakeCodec({ size: PICTURE_MAX_BYTES + 1 })),
    ).rejects.toEqual(new PictureTooLargeError('picture'))
  })

  it('refuses a browser without a canvas when it uses its own codec', async () => {
    // jsdom has neither createImageBitmap nor OffscreenCanvas.
    await expect(preparePicture(fileOf('image/png'))).rejects.toBeInstanceOf(
      PictureUnsupportedError,
    )
  })
})

describe('pictureErrorMessage', () => {
  it('explains each failure in Turkish', () => {
    expect(pictureErrorMessage(new PictureTypeError())).toBe(
      'Yalnızca PNG, JPEG ya da WebP bir resim kullanılabilir.',
    )
    expect(pictureErrorMessage(new PictureTooLargeError('file'))).toContain('20 MB')
    expect(pictureErrorMessage(new PictureTooLargeError('picture'))).toContain('1 MB')
    expect(pictureErrorMessage(new PictureUnsupportedError())).toContain('Chrome')
    expect(pictureErrorMessage(new PictureUnreadableError())).toContain('okunamadı')
    expect(pictureErrorMessage(new Error('other'))).toBeNull()
  })
})

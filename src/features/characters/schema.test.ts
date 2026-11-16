import { type QueryDocumentSnapshot, Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { InvalidDataError } from '@/lib/firestore/errors'

import { characterConverter, characterSchema } from './schema'

const ID = 'AbCdEfGhIj0123456789'

const stored = {
  uid: 'ayla',
  name: 'Thorin',
  picture: null,
  archived: false,
  createdAt: Timestamp.fromMillis(1),
  createdBy: 'ayla',
}

/** A snapshot of `data` at `characters/<id>`, as the converter receives it. */
function snapshotOf(data: unknown, id = ID): QueryDocumentSnapshot {
  return {
    id,
    ref: { path: `characters/${id}` },
    data: () => data,
  } as unknown as QueryDocumentSnapshot
}

describe('characterSchema', () => {
  it('reads a character without a photo', () => {
    expect(characterSchema.parse(stored)).toEqual(stored)
  })

  it('reads a pending creation time', () => {
    expect(characterSchema.parse({ ...stored, createdAt: null }).createdAt).toBeNull()
  })

  it.each([
    ['an empty name', { name: '' }],
    ['a name of 41 characters', { name: 'x'.repeat(41) }],
    ['a photo outside the character photos', { picture: `cards/${ID}/0123456789.webp` }],
    ['a missing archived flag', { archived: undefined }],
    ['no owner', { uid: '' }],
  ])('rejects %s', (_case, change) => {
    expect(characterSchema.safeParse({ ...stored, ...change }).success).toBe(false)
  })

  it('reads an initiative modifier', () => {
    expect(characterSchema.parse({ ...stored, initiativeModifier: 3 }).initiativeModifier).toBe(3)
  })

  it('reads a character that never rolled initiative', () => {
    expect(characterSchema.parse(stored).initiativeModifier).toBeUndefined()
  })

  it.each([
    ['31', 31],
    ['−11', -11],
    ['2.5', 2.5],
  ])('rejects the initiative modifier %s', (_case, initiativeModifier) => {
    expect(characterSchema.safeParse({ ...stored, initiativeModifier }).success).toBe(false)
  })

  it('accepts a name of 40 characters', () => {
    expect(characterSchema.safeParse({ ...stored, name: 'x'.repeat(40) }).success).toBe(true)
  })

  it.each([
    ['an https', 'https://docs.google.com/document/d/abc'],
    ['an http', 'http://example.com/sheet'],
    ['a 2048-character', `https://example.com/${'x'.repeat(2048 - 20)}`],
  ])('reads %s sheet link', (_case, sheetUrl) => {
    expect(characterSchema.parse({ ...stored, sheetUrl }).sheetUrl).toBe(sheetUrl)
  })

  it('reads a character without a sheet link', () => {
    expect(characterSchema.parse(stored).sheetUrl).toBeUndefined()
  })

  it.each([
    ['a script', 'javascript:alert(1)'],
    ['an upper-case start', 'HTTPS://x'],
    ['a line break', 'https://example.com/\nx'],
    ['2049 characters', `https://example.com/${'x'.repeat(2049 - 20)}`],
    ['a start alone', 'https://'],
    ['null', null],
  ])('rejects a sheet link with %s', (_case, sheetUrl) => {
    expect(characterSchema.safeParse({ ...stored, sheetUrl }).success).toBe(false)
  })
})

describe('characterConverter', () => {
  it('reads the ID and its own photo', () => {
    const picture = `characters/${ID}/0123456789.webp`
    expect(characterConverter.fromFirestore(snapshotOf({ ...stored, picture }))).toEqual({
      ...stored,
      picture,
      id: ID,
    })
  })

  it("rejects another character's photo", () => {
    const picture = 'characters/ZyXwVuTsRq9876543210/0123456789.webp'
    expect(() => characterConverter.fromFirestore(snapshotOf({ ...stored, picture }))).toThrow(
      InvalidDataError,
    )
  })
})

import { describe, expect, it } from 'vitest'

import { type PictureDefinition, pictureRecords } from './importPictures.ts'

function definition(name: string, overrides: Partial<PictureDefinition> = {}): PictureDefinition {
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return {
    target: 'card',
    id: `legend-${nameKey}`,
    kind: 'normal',
    name,
    nameKey,
    status: 'active',
    isInLibrary: true,
    picture: { kind: 'never' },
    ...overrides,
  }
}

const names = (items: readonly PictureDefinition[]) => items.map((item) => item.name)

describe('pictureRecords', () => {
  it('keeps the hidden definitions out of the public record, in a DM-only record of their own', () => {
    const records = pictureRecords([
      definition("Aboleth's Eyes"),
      definition('Old Card', { status: 'retired' }),
      definition('The Last Wish', { isInLibrary: false }),
      definition('The Cartographer', { status: 'draft' }),
      definition('Secret Draft', { status: 'draft', isInLibrary: false }),
      definition('Abyss', { target: 'word', id: 'tw-abyss', kind: null }),
      definition('Justice', { target: 'word', id: 'tw-justice', kind: null, isInLibrary: false }),
    ])
    expect(
      records.map((record) => ({
        target: record.target,
        isPublic: record.isPublic,
        names: names(record.items),
      })),
    ).toEqual([
      { target: 'card', isPublic: true, names: ["Aboleth's Eyes", 'Old Card'] },
      { target: 'card', isPublic: false, names: ['The Cartographer', 'Secret Draft'] },
      { target: 'card', isPublic: false, names: ['The Last Wish'] },
      { target: 'word', isPublic: true, names: ['Abyss'] },
      { target: 'word', isPublic: false, names: ['Justice'] },
    ])
  })

  it('writes no record when nothing got a picture', () => {
    expect(pictureRecords([])).toEqual([])
  })
})

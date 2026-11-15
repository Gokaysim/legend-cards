import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { startingFlags } from './flags'
import { definitionChangeSchema, isPublicStep, stepFor } from './schema'
import type { DefinitionStatus } from './status'

const at = Timestamp.fromMillis(1000)

describe('stepFor and isPublicStep', () => {
  // The table of design D5: before, after, step, public.
  it.each<[DefinitionStatus | null, DefinitionStatus | null, string, boolean]>([
    [null, 'draft', 'added', false],
    [null, 'active', 'added', true],
    ['draft', 'draft', 'edited', false],
    ['draft', 'active', 'published', true],
    ['active', 'active', 'edited', true],
    ['active', 'retired', 'retired', true],
    ['retired', 'retired', 'edited', true],
    ['retired', 'active', 'restored', true],
    ['draft', null, 'deleted', false],
  ])('%s → %s is %s', (before, after, step, isPublic) => {
    expect(stepFor(before, after)).toBe(step)
    const snapshot = (status: DefinitionStatus | null) =>
      status === null ? null : { status, isInLibrary: true }
    expect(isPublicStep(snapshot(before), snapshot(after))).toBe(isPublic)
  })

  // Spec: definition-editing, "Who reads the change records".
  type Shown = { status: DefinitionStatus; isInLibrary: boolean }
  it.each<[string, Shown | null, Shown | null, boolean]>([
    [
      'an edit of a hidden card',
      { status: 'active', isInLibrary: false },
      { status: 'active', isInLibrary: false },
      false,
    ],
    [
      'turning "Listede görünür" off',
      { status: 'active', isInLibrary: true },
      { status: 'active', isInLibrary: false },
      true,
    ],
    [
      'turning "Listede görünür" on',
      { status: 'active', isInLibrary: false },
      { status: 'active', isInLibrary: true },
      true,
    ],
    ['adding a hidden draft', null, { status: 'draft', isInLibrary: false }, false],
    [
      'publishing a hidden draft',
      { status: 'draft', isInLibrary: false },
      { status: 'active', isInLibrary: false },
      false,
    ],
    [
      'retiring a hidden card',
      { status: 'active', isInLibrary: false },
      { status: 'retired', isInLibrary: false },
      false,
    ],
  ])('%s is public: %s', (_name, before, after, isPublic) => {
    expect(isPublicStep(before, after)).toBe(isPublic)
  })

  it.each<[DefinitionStatus | null, DefinitionStatus | null]>([
    ['active', 'draft'],
    ['retired', 'draft'],
    ['draft', 'retired'],
    [null, 'retired'],
    ['active', null],
    ['retired', null],
    [null, null],
  ])('allows no step from %s to %s', (before, after) => {
    expect(stepFor(before, after)).toBeNull()
  })
})

describe('definitionChangeSchema', () => {
  it('refuses a public record of an edit of a hidden card', () => {
    const before = { ...card, isInLibrary: false }
    const result = definitionChangeSchema.safeParse({
      ...edit,
      before,
      after: { ...before, cost: '3' },
    })
    expect(result.success).toBe(false)
  })

  const card = {
    kind: 'normal',
    name: "Aboleth's Eyes",
    nameKey: 'abolethseyes',
    setCode: 'Kesqer',
    cost: '2',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: 'Text.',
    status: 'active',
    picture: null,
    ...startingFlags('normal', ''),
  }
  const edit = {
    target: 'card',
    targetId: 'legend-abolethseyes',
    name: "Aboleth's Eyes",
    step: 'edited',
    before: card,
    after: { ...card, cost: '3' },
    public: true,
    by: 'dana',
    at,
  }
  const word = {
    kind: 'trueWord',
    name: 'Echo',
    nameKey: 'echo',
    setCode: null,
    cost: null,
    rarity: null,
    mechanicPack: null,
    text: '',
    status: 'draft',
    picture: null,
    ...startingFlags('trueWord', ''),
  }
  const wordAdded = {
    target: 'word',
    targetId: 'tw-echo',
    name: 'Echo',
    step: 'added',
    before: null,
    after: word,
    public: false,
    by: 'dana',
    at,
  }
  const imported = {
    target: 'card',
    step: 'imported',
    items: [
      { id: 'legend-abolethseyes', name: "Aboleth's Eyes", status: 'active', isInLibrary: true },
    ],
    public: true,
    by: null,
    at,
  }

  it.each([
    ['an edit of an active card', edit],
    ['a draft word added', wordAdded],
    ['a publish', { ...edit, step: 'published', before: { ...card, status: 'draft' } }],
    [
      'a draft deleted',
      { ...wordAdded, step: 'deleted', before: word, after: null, public: false },
    ],
    ['an import of active cards', imported],
    [
      'an import of drafts',
      {
        ...imported,
        public: false,
        items: [{ id: 'tw-echo', name: 'Echo', status: 'draft', isInLibrary: true }],
      },
    ],
    ['a step whose server time is pending', { ...edit, at: null }],
    [
      'a picture change',
      {
        ...edit,
        before: { ...card, picture: null },
        after: { ...card, picture: 'cards/legend-abolethseyes/93e6f39a91.webp' },
      },
    ],
    [
      'a picture import of active and retired cards',
      {
        ...imported,
        what: 'pictures',
        items: [
          ...imported.items,
          { id: 'legend-hex', name: 'Hex', status: 'retired', isInLibrary: true },
        ],
      },
    ],
    [
      'a picture import of drafts',
      {
        ...imported,
        what: 'pictures',
        public: false,
        items: [{ id: 'tw-echo', name: 'Echo', status: 'draft', isInLibrary: true }],
      },
    ],
    [
      'a picture import of a hidden active card',
      {
        ...imported,
        what: 'pictures',
        public: false,
        items: [{ id: 'legend-wish', name: 'The Last Wish', status: 'active', isInLibrary: false }],
      },
    ],
  ])('accepts %s', (_case, record) => {
    expect(definitionChangeSchema.safeParse(record).success).toBe(true)
  })

  it.each([
    ['a step that does not match its statuses', { ...edit, step: 'published' }],
    ['a forbidden step', { ...edit, step: 'edited', after: { ...card, status: 'draft' } }],
    ['draft work marked public', { ...wordAdded, public: true }],
    ['a public change marked private', { ...edit, public: false }],
    ['a name that is not the definition’s', { ...edit, name: 'Other' }],
    ['a deleted active card', { ...edit, step: 'deleted', after: null }],
    ['a word snapshot on a card record', { ...edit, before: word, after: word }],
    ['a card snapshot on a word record', { ...wordAdded, after: { ...card, status: 'draft' } }],
    [
      'a public picture import listing a hidden card',
      {
        ...imported,
        what: 'pictures',
        items: [{ ...imported.items[0], isInLibrary: false }],
      },
    ],
    ['a snapshot without its flags', { ...edit, after: { ...card, isInDraws: undefined } }],
    ['a step without who made it', { ...edit, by: null }],
    [
      'a public import listing a draft',
      { ...imported, items: [{ ...imported.items[0], status: 'draft' }] },
    ],
    ['an import naming a user', { ...imported, by: 'dana' }],
    ['an empty import', { ...imported, items: [] }],
    [
      'a public definition import listing a retired card',
      { ...imported, items: [{ ...imported.items[0], status: 'retired' }] },
    ],
    [
      'a public picture import listing a draft',
      { ...imported, what: 'pictures', items: [{ ...imported.items[0], status: 'draft' }] },
    ],
    ['an unknown import kind', { ...imported, what: 'cardbacks' }],
    [
      'a snapshot picture that is not a stored path',
      { ...edit, after: { ...card, picture: 'x.png' } },
    ],
  ])('rejects %s', (_case, record) => {
    expect(definitionChangeSchema.safeParse(record).success).toBe(false)
  })

  it('reads a record without an import kind as a definitions import', () => {
    const run = definitionChangeSchema.parse(imported)
    expect(run.step === 'imported' && run.what).toBe('definitions')
  })
})

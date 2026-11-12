import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

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
  const word = { name: 'Echo', nameKey: 'echo', cost: null, text: '', status: 'draft' }
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
    items: [{ id: 'legend-abolethseyes', name: "Aboleth's Eyes", status: 'active' }],
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
      { ...imported, public: false, items: [{ id: 'tw-echo', name: 'Echo', status: 'draft' }] },
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
        items: [...imported.items, { id: 'legend-hex', name: 'Hex', status: 'retired' }],
      },
    ],
    [
      'a picture import of drafts',
      {
        ...imported,
        what: 'pictures',
        public: false,
        items: [{ id: 'tw-echo', name: 'Echo', status: 'draft' }],
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

  it('reads an older record without pictures or an import kind', () => {
    const step = definitionChangeSchema.parse(edit)
    expect(step.step === 'edited' && step.before?.picture).toBeNull()
    const run = definitionChangeSchema.parse(imported)
    expect(run.step === 'imported' && run.what).toBe('definitions')
  })
})

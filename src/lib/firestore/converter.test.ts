import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createConverter } from './converter'
import { InvalidDataError } from './errors'

const cardSchema = z.object({
  name: z.string(),
  cost: z.string().default('0'),
})

const converter = createConverter(cardSchema)

/** A minimal stand-in for a Firestore snapshot: only the parts the converter reads. */
function fakeSnapshot(path: string, data: unknown): QueryDocumentSnapshot {
  const id = path.split('/').at(-1) ?? ''
  return { id, data: () => data, ref: { path } } as unknown as QueryDocumentSnapshot
}

describe('createConverter', () => {
  it('returns parsed data, including schema defaults', () => {
    expect(converter.fromFirestore(fakeSnapshot('cards/c1', { name: 'Aa-Uskh' }))).toEqual({
      name: 'Aa-Uskh',
      cost: '0',
    })
  })

  it('throws InvalidDataError naming the document when the data does not match', () => {
    const read = () => converter.fromFirestore(fakeSnapshot('cards/c2', { cost: 3 }))

    expect(read).toThrow(InvalidDataError)
    expect(read).toThrow(/cards\/c2/)
  })

  it('passes writes through unchanged', () => {
    const model = { name: 'Aa-Uskh', cost: '1' }

    expect(converter.toFirestore(model)).toBe(model)
  })

  it('does not add the document ID without the idField option', () => {
    expect(
      converter.fromFirestore(fakeSnapshot('cards/c1', { name: 'Aa-Uskh' })),
    ).not.toHaveProperty('id')
  })
})

describe('createConverter with idField', () => {
  const withId = createConverter(cardSchema, { idField: 'id' })

  it('adds the document ID to the parsed data', () => {
    const card = withId.fromFirestore(fakeSnapshot('cards/c7', { name: 'Aa-Uskh' }))

    expect(card).toEqual({ id: 'c7', name: 'Aa-Uskh', cost: '0' })
    // The type includes the ID as a string.
    const id: string = card.id
    expect(id).toBe('c7')
  })

  it('drops the ID field from writes, keeping everything else', () => {
    expect(withId.toFirestore({ id: 'c7', name: 'Aa-Uskh', cost: '1' })).toEqual({
      name: 'Aa-Uskh',
      cost: '1',
    })
  })

  it('still rejects documents that do not match the schema', () => {
    expect(() => withId.fromFirestore(fakeSnapshot('cards/c8', { cost: 3 }))).toThrow(/cards\/c8/)
  })
})

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
  return { data: () => data, ref: { path } } as unknown as QueryDocumentSnapshot
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
})

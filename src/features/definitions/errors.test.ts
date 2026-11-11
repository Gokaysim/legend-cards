import { describe, expect, it } from 'vitest'

import { TableBusyError } from '@/features/table/errors'

import {
  DefinitionChangedError,
  definitionFailureMessage,
  IncompleteDefinitionError,
  NameTakenError,
  toDefinitionFailure,
} from './errors'

/** A Firestore error as the SDK throws it: an `Error` with a `code`. */
function firestoreError(code: string): Error {
  return Object.assign(new Error(code), { code })
}

describe('toDefinitionFailure', () => {
  it.each([
    [new NameTakenError(), 'name-taken'],
    [new DefinitionChangedError(), 'changed'],
    [new IncompleteDefinitionError(), 'incomplete'],
    [new TableBusyError('p1'), 'table-busy'],
    [firestoreError('permission-denied'), 'permission-denied'],
    [firestoreError('unavailable'), 'offline'],
    [new Error('other'), 'unknown'],
  ])('maps %o to %s', (error, kind) => {
    expect(toDefinitionFailure(error).kind).toBe(kind)
  })
})

describe('definitionFailureMessage', () => {
  it('names the definition in Turkish', () => {
    expect(definitionFailureMessage({ kind: 'name-taken' }, 'kart')).toBe(
      'Bu adla bir kart zaten var.',
    )
    expect(definitionFailureMessage({ kind: 'changed' }, 'True Word')).toContain(
      'başka bir yerde değişti',
    )
  })
})

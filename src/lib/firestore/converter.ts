import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore'
import type { z } from 'zod'

import { InvalidDataError } from './errors'

export type ConverterOptions<K extends string> = {
  /**
   * Adds the document ID to every read result under this field name, and drops that field from writes,
   * so the ID is never stored inside the document.
   */
  idField: K
}

/**
 * Turns a zod schema into a Firestore converter. Every document read through it is validated:
 * a document that does not match throws `InvalidDataError`, which subscriptions report as `invalid-data`.
 *
 * Writes pass through unchanged (apart from dropping `idField`), because they may contain sentinels such as
 * `serverTimestamp()`. Validate writes in the feature's `api.ts` when needed.
 *
 * Create each converter once, at module level next to its schema: refs with the same converter
 * instance compare equal, which keeps subscriptions from resubscribing on every render.
 */
export function createConverter<T extends DocumentData>(
  schema: z.ZodType<T>,
): FirestoreDataConverter<T, DocumentData>
export function createConverter<T extends DocumentData, K extends string>(
  schema: z.ZodType<T>,
  options: ConverterOptions<K>,
): FirestoreDataConverter<T & Record<K, string>, DocumentData>
export function createConverter<T extends DocumentData, K extends string>(
  schema: z.ZodType<T>,
  options?: ConverterOptions<K>,
): FirestoreDataConverter<T, DocumentData> {
  const idField = options?.idField
  return {
    toFirestore(model: WithFieldValue<T>): WithFieldValue<DocumentData> {
      if (idField === undefined) return model
      return Object.fromEntries(Object.entries(model).filter(([key]) => key !== idField))
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, snapshotOptions?: SnapshotOptions): T {
      const result = schema.safeParse(snapshot.data(snapshotOptions))
      if (!result.success) throw new InvalidDataError(snapshot.ref.path, result.error.issues)
      return idField === undefined ? result.data : { ...result.data, [idField]: snapshot.id }
    },
  }
}

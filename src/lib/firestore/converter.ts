import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore'
import type { z } from 'zod'

import { InvalidDataError } from './errors'

/**
 * Turns a zod schema into a Firestore converter. Every document read through it is validated:
 * a document that does not match throws `InvalidDataError`, which subscriptions report as `invalid-data`.
 *
 * Writes pass through unchanged, because they may contain sentinels such as `serverTimestamp()`.
 * Validate writes in the feature's `api.ts` when needed.
 *
 * Create each converter once, at module level next to its schema: refs with the same converter
 * instance compare equal, which keeps subscriptions from resubscribing on every render.
 */
export function createConverter<T extends DocumentData>(
  schema: z.ZodType<T>,
): FirestoreDataConverter<T, DocumentData> {
  return {
    toFirestore(model: WithFieldValue<T>): WithFieldValue<DocumentData> {
      return model
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const result = schema.safeParse(snapshot.data(options))
      if (!result.success) throw new InvalidDataError(snapshot.ref.path, result.error.issues)
      return result.data
    },
  }
}

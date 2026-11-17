import { type DocumentReference, onSnapshot, refEqual } from 'firebase/firestore'

import { toSubscriptionError } from './errors'
import {
  equalOrBothNull,
  type SubscribeFn,
  subscribeOrEmpty,
  type Subscription,
  useSnapshotSubscription,
} from './subscription'

function subscribeToDocument<T>(
  ref: DocumentReference<T>,
  emit: (state: Subscription<T | null>) => void,
) {
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    {
      next: (snapshot) => {
        try {
          // data() runs the converter, which throws InvalidDataError for a malformed document.
          const data = snapshot.exists() ? snapshot.data() : null
          emit({
            status: 'ready',
            data,
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          })
        } catch (error) {
          emit({ status: 'error', error: toSubscriptionError(error, ref.path) })
        }
      },
      error: (error) => {
        emit({ status: 'error', error: toSubscriptionError(error, ref.path) })
      },
    },
  )
}

const refEqualOrBothNull = equalOrBothNull(refEqual)
const subscribeToDocumentOrNothing = subscribeOrEmpty<DocumentReference<unknown>, unknown>(
  subscribeToDocument,
  null,
)

/** A document ref together with the key that restarts its subscription. */
type KeyedRef = { ref: DocumentReference<unknown> | null; key: number | undefined }

function keyedRefEqual(a: KeyedRef, b: KeyedRef): boolean {
  return a.key === b.key && refEqualOrBothNull(a.ref, b.ref)
}

const subscribeToKeyedRef: SubscribeFn<KeyedRef, unknown> = (target, emit) =>
  subscribeToDocumentOrNothing(target.ref, emit)

/**
 * Subscribes to one document in real time. A missing document is `ready` with `data: null`.
 * Build `ref` with a converter from `createConverter`, so the data is validated and typed.
 * Pass `null` when there is nothing to subscribe to yet: the result is `ready` with `data: null`.
 * A new `key` drops the current subscription and starts a new one on the same ref, for example to retry after an
 * error; until the new one answers, the result is `loading`.
 */
export function useDocument<T>(
  ref: DocumentReference<T> | null,
  key?: number,
): Subscription<T | null> {
  return useSnapshotSubscription<KeyedRef, unknown>(
    { ref, key },
    keyedRefEqual,
    subscribeToKeyedRef,
  ) as Subscription<T | null>
}

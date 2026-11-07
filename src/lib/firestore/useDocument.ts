import { type DocumentReference, onSnapshot, refEqual } from 'firebase/firestore'

import { toSubscriptionError } from './errors'
import { type SubscribeFn, type Subscription, useSnapshotSubscription } from './subscription'

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

/**
 * Subscribes to one document in real time. A missing document is `ready` with `data: null`.
 * Build `ref` with a converter from `createConverter`, so the data is validated and typed.
 */
export function useDocument<T>(ref: DocumentReference<T>): Subscription<T | null> {
  return useSnapshotSubscription(
    ref,
    refEqual,
    subscribeToDocument as SubscribeFn<DocumentReference<T>, T | null>,
  )
}

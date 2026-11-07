import { onSnapshot, type Query, queryEqual } from 'firebase/firestore'

import { toSubscriptionError } from './errors'
import { type SubscribeFn, type Subscription, useSnapshotSubscription } from './subscription'

/** A readable path for error reports: the collection path, or a marker for other queries. */
function describeQuery(query: Query<unknown>): string {
  return 'path' in query && typeof query.path === 'string' ? query.path : '(query)'
}

function subscribeToQuery<T>(query: Query<T>, emit: (state: Subscription<T[]>) => void) {
  return onSnapshot(
    query,
    { includeMetadataChanges: true },
    {
      next: (snapshot) => {
        try {
          // Strict on purpose: one malformed document fails the whole subscription, so data bugs surface.
          const data = snapshot.docs.map((document) => document.data())
          emit({
            status: 'ready',
            data,
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          })
        } catch (error) {
          emit({ status: 'error', error: toSubscriptionError(error, describeQuery(query)) })
        }
      },
      error: (error) => {
        emit({ status: 'error', error: toSubscriptionError(error, describeQuery(query)) })
      },
    },
  )
}

/**
 * Subscribes to a collection or query in real time. `data` holds the matching documents in query order.
 * Build the query from a ref with a converter from `createConverter`, so every document is validated.
 */
export function useCollection<T>(query: Query<T>): Subscription<T[]> {
  return useSnapshotSubscription(query, queryEqual, subscribeToQuery as SubscribeFn<Query<T>, T[]>)
}

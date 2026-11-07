import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getSnapshot = () => navigator.onLine

/**
 * Whether the browser reports a network connection. Firestore has no public "connected" signal;
 * per-view staleness comes from a subscription's `fromCache` and `hasPendingWrites` instead.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

import type { ReactNode } from 'react'

import { useIsDm } from './usersContext'

/**
 * Shows its children only to the DM. Players, and anyone whose profile is still loading, see nothing.
 * This only tidies the interface: `firestore.rules` decides what each role may actually do.
 */
export function DmOnly({ children }: { children: ReactNode }) {
  return useIsDm() ? children : null
}

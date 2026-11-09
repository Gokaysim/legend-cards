import { useState } from 'react'

/**
 * The pack to show: the open one while a pack is open, and after it ends the last one that was open, until another
 * opens. So every device can still show how the pack ended once the table is free. `null` until a pack is seen.
 */
export function useLastPackId(openPackId: string | null): string | null {
  const [lastId, setLastId] = useState(openPackId)
  if (openPackId !== null && openPackId !== lastId) {
    // Adjusting state during render: React re-renders at once with the new pack.
    setLastId(openPackId)
    return openPackId
  }
  return lastId
}

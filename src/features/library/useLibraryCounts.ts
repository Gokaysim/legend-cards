import { useMemo } from 'react'

import type { LibraryTab } from '@/app/screens'
import { useDeckCards } from '@/features/cards/cardsContext'
import { useTrueWords } from '@/features/true-words/trueWordsContext'
import { useIsDm } from '@/features/users/usersContext'

/**
 * How many active definitions each tab of the Kütüphane lists at "Yayında", for this user: a player's counts leave
 * out those whose "Listede görünür" is off, the DM's include them (spec: card-library, "The Kütüphane screen and its
 * tabs"). A tab whose definitions are still loading, or failed, has no count.
 */
export function useLibraryCounts(): Partial<Record<LibraryTab, number>> {
  const isDm = useIsDm()
  const legend = useDeckCards('legend')
  const cursed = useDeckCards('cursed')
  const words = useTrueWords()
  return useMemo(
    () => ({
      cards: legend.status === 'ready' ? legend.data.length : undefined,
      cursed: cursed.status === 'ready' ? cursed.data.length : undefined,
      'true-words':
        words.status === 'ready'
          ? words.data.filter((word) => word.status === 'active' && (isDm || word.isInLibrary))
              .length
          : undefined,
    }),
    [isDm, legend, cursed, words],
  )
}

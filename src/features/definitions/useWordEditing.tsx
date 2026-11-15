import { useMemo, useState } from 'react'

import type { TrueWord } from '@/features/cards/schema'
import { useTrueWords } from '@/features/true-words/trueWordsContext'
import { useIsDm } from '@/features/users/usersContext'

import { type CardFilterValue, DEFAULT_STATUS_FILTER, filterCards } from './statusFilterOptions'
import type { DefinitionEditing } from './useCardEditing'
import { WordFormDialog } from './WordFormDialog'

/**
 * The DM's True Word editing on the True Words tab (spec: card-library, "The DM's status filter"): the status filter
 * over every word, each word's "✎ Düzenle" and the form it opens. A player gets the active words whose "Listede görünür" is on, and none of the controls (spec:
 * card-library, "Cards not listed for players").
 */
export function useWordEditing(): DefinitionEditing<TrueWord> {
  const isDm = useIsDm()
  const words = useTrueWords()
  const [filter, setFilter] = useState<CardFilterValue>(DEFAULT_STATUS_FILTER)
  const [editingId, setEditingId] = useState<string | null>(null)
  const listed = useMemo(
    () =>
      isDm
        ? filterCards(words, filter)
        : words.status === 'ready'
          ? {
              ...words,
              data: words.data.filter((word) => word.status === 'active' && word.isInLibrary),
            }
          : words,
    [isDm, words, filter],
  )

  if (!isDm) return { cards: listed, browserProps: {}, dialog: null }
  return {
    cards: listed,
    browserProps: {
      statusFilter: { value: filter, onChange: setFilter },
      onEdit: (word) => setEditingId(word.id),
    },
    dialog:
      editingId === null ? null : (
        <WordFormDialog wordId={editingId} onClose={() => setEditingId(null)} />
      ),
  }
}

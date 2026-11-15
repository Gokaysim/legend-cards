import { useMemo } from 'react'

import type { CardStatus } from '@/features/cards/status'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useProfiles } from '@/features/users/usersContext'

import { isKnown, type LearnedWord, type TrueWord } from './schema'
import { compareLearnOrder, useTrueWordRecords, useTrueWords } from './trueWordsContext'

/**
 * Every word's status for the Kütüphane's Durum (spec: card-library, "Durum of a True Word"): never in a pool, and as
 * its holders the players who know it now, in the order they learned it, each once.
 */
export function wordStatuses(
  words: readonly TrueWord[],
  records: readonly LearnedWord[],
  profiles: readonly UserProfile[],
): Map<string, CardStatus> {
  const names = new Map(profiles.map((profile) => [profile.id, profileName(profile)]))
  const knowers = new Map<string, string[]>()
  for (const record of records.filter(isKnown).sort(compareLearnOrder)) {
    const uids = knowers.get(record.wordId)
    if (!uids) knowers.set(record.wordId, [record.uid])
    else if (!uids.includes(record.uid)) uids.push(record.uid)
  }
  return new Map(
    words.map((word) => [
      word.id,
      {
        inPool: false,
        holderNames: (knowers.get(word.id) ?? []).map((uid) => names.get(uid) ?? 'İsimsiz oyuncu'),
      },
    ]),
  )
}

/**
 * The status of every word this device reads, live. `null` while the words, the known words or the profiles load or
 * fail. Must be used inside `<TrueWordsProvider>` and `<UsersProvider>`.
 */
export function useWordStatuses(): ReadonlyMap<string, CardStatus> | null {
  const words = useTrueWords()
  const records = useTrueWordRecords()
  const profiles = useProfiles()
  return useMemo(
    () =>
      words.status === 'ready' && records.status === 'ready' && profiles.status === 'ready'
        ? wordStatuses(words.data, records.data, profiles.data)
        : null,
    [words, records, profiles],
  )
}

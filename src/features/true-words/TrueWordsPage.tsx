import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { compareLabels } from '@/features/cards/sort'
import { StatusFilter } from '@/features/definitions/StatusFilter'
import {
  DEFAULT_STATUS_FILTER,
  STATUS_FILTER_OPTIONS,
  type StatusFilterValue,
} from '@/features/definitions/statusFilterOptions'
import { STATUS_LABELS } from '@/features/definitions/status'
import { WordFormDialog } from '@/features/definitions/WordFormDialog'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { DraftStart } from './DraftStart'
import { OpenDraftPanel } from './OpenDraftPanel'
import type { TrueWord } from './schema'
import { TrueWordTile } from './TrueWordTile'
import { activeWordsSorted, useKnownWords, useOpenDraft, useTrueWords } from './trueWordsContext'

/** The search parameter of the DM's chosen player; see `trueWordsPath`. */
const FOR_PARAM = 'for'

/**
 * The True Words screen: every active word, sorted by name, with its cost and text, and the draft. A player sees it
 * for themselves; the DM picks the player, kept in the URL (`?for=`). The chosen player's known words are marked
 * "Biliyor", and their open draft shows above the list, live. The DM also adds and edits words here, and browses the
 * drafts and the retired words through the status filter (spec: true-words, "True Words screen").
 */
export function TrueWordsPage() {
  const { label: title, mascot } = screenById('true-words')
  const words = useTrueWords()
  const isDm = useIsDm()
  // `null` while closed; `wordId: null` adds a word.
  const [editing, setEditing] = useState<{ wordId: string | null } | null>(null)
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={title}
        mascot={mascot}
        actions={
          isDm ? (
            <Button onClick={() => setEditing({ wordId: null })}>+ True Word ekle</Button>
          ) : null
        }
      />
      {words.status === 'loading' ? (
        <Spinner label="True Words yükleniyor…" className="py-12" />
      ) : words.status === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          True Words yüklenemedi.
        </p>
      ) : (
        <TrueWordsScreen
          words={words.data}
          onEdit={isDm ? (word) => setEditing({ wordId: word.id }) : undefined}
        />
      )}
      {editing ? <WordFormDialog wordId={editing.wordId} onClose={() => setEditing(null)} /> : null}
    </section>
  )
}

function TrueWordsScreen({
  words,
  onEdit,
}: {
  words: readonly TrueWord[]
  /** For the DM: each word's "✎ Düzenle", and the status filter. */
  onEdit?: (word: TrueWord) => void
}) {
  const ids = useId()
  const auth = useAuth()
  const isDm = useIsDm()
  const profiles = useProfiles()
  const [params, setParams] = useSearchParams()

  const profileList = profiles.status === 'ready' ? profiles.data : []
  const myUid = auth.status === 'signedIn' ? auth.user.uid : null
  const requested = params.get(FOR_PARAM)
  const owner: UserProfile | undefined = isDm
    ? (profileList.find((profile) => profile.id === requested) ??
      profileList.find((profile) => profile.role !== 'dm') ??
      profileList.find((profile) => profile.id === myUid))
    : profileList.find((profile) => profile.id === myUid)

  const knownWords = useKnownWords(owner?.id ?? '')
  const openDraft = useOpenDraft(owner?.id ?? '')
  const known = useMemo(
    () =>
      new Set(knownWords.status === 'ready' ? knownWords.data.map((record) => record.wordId) : []),
    [knownWords],
  )
  const wordsById = useMemo(() => new Map(words.map((word) => [word.id, word])), [words])
  const [filter, setFilter] = useState<StatusFilterValue>(DEFAULT_STATUS_FILTER)
  const listed = useMemo(
    () =>
      !isDm
        ? activeWordsSorted(words)
        : words
            .filter((word) => filter === 'all' || word.status === filter)
            .sort((a, b) => compareLabels(a.name, b.name)),
    [isDm, words, filter],
  )
  const showsStatus = isDm && filter !== 'active'
  const draft = openDraft.status === 'ready' ? openDraft.data : null

  return (
    <>
      {isDm ? (
        <div className="flex max-w-sm flex-col gap-1">
          <label htmlFor={`${ids}-for`} className="text-sm font-medium text-ink">
            Kimin için
          </label>
          <select
            id={`${ids}-for`}
            value={owner?.id ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              next.set(FOR_PARAM, event.target.value)
              setParams(next)
            }}
            className="w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink"
          >
            {profileList.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}
                {profile.role === 'dm' ? ' (DM)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {owner === undefined ? null : knownWords.status === 'ready' &&
        openDraft.status === 'ready' ? (
        <DraftStart owner={owner} words={words} known={known} hasOpenDraft={draft !== null} />
      ) : (
        <Spinner label="True Words yükleniyor…" className="py-4" />
      )}

      {owner !== undefined && draft !== null ? (
        <OpenDraftPanel draft={draft} wordsById={wordsById} ownerName={profileName(owner)} />
      ) : null}

      <section aria-labelledby={`${ids}-list`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${ids}-list`} className="text-lg font-semibold text-ink">
            {`True Words (${listed.length})`}
          </h2>
          {isDm ? (
            <StatusFilter
              value={filter}
              onChange={setFilter}
              options={STATUS_FILTER_OPTIONS}
              className="w-auto"
            />
          ) : null}
        </div>
        {listed.length === 0 ? (
          <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
            {showsStatus ? 'Bu durumda True Word yok.' : 'Henüz True Word yok.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {listed.map((word) => (
              <li key={word.id}>
                <TrueWordTile word={word} isKnown={known.has(word.id)}>
                  {showsStatus || onEdit ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {showsStatus ? (
                        <span className="rounded-full border border-ink-muted px-2 py-0.5 text-xs text-ink">
                          {STATUS_LABELS[word.status]}
                        </span>
                      ) : (
                        <span />
                      )}
                      {onEdit ? (
                        <Button aria-label={`${word.name}: düzenle`} onClick={() => onEdit(word)}>
                          ✎ Düzenle
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </TrueWordTile>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

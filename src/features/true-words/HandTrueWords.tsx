import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { libraryPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'

import { OpenDraftPanel } from './OpenDraftPanel'
import type { TrueWord } from './schema'
import { TeachWordDialog } from './TeachWordDialog'
import { TrueWordTile } from './TrueWordTile'
import { type KnownWordEntry, useOpenDraft } from './trueWordsContext'

export type HandTrueWordsProps = {
  profile: UserProfile
  /** Every word, retired ones included. */
  words: readonly TrueWord[]
  /** The player's known words, in the order learned. */
  entries: readonly KnownWordEntry[]
  /** Opens a word's details, by its learned word record. The hand screen shows them beside the tab or in a dialog. */
  onSelect: (recordId: string) => void
  /** The record whose details show beside the tab, if any: its tile glows gold and is marked. */
  selectedId?: string | null
}

/**
 * A hand's True Words tab (v2.2.8's `trueWordsHand`): its heading, the player's open draft, live, their known words in
 * the order learned as their pictures with their active state (design D9), and a link to the draft on the Kütüphane's
 * True Words tab. Selecting a word opens its details. The DM also gets "+ True Word öğret".
 */
export function HandTrueWords({
  profile,
  words,
  entries,
  onSelect,
  selectedId = null,
}: HandTrueWordsProps) {
  const ids = useId()
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const openDraft = useOpenDraft(profile.id)
  const [isTeaching, setIsTeaching] = useState(false)

  const name = profileName(profile)
  const wordsById = useMemo(() => new Map(words.map((word) => [word.id, word])), [words])
  const known = useMemo(() => new Set(entries.map((entry) => entry.record.wordId)), [entries])
  const draft = openDraft.status === 'ready' ? openDraft.data : null

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-pane p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-title`} className="font-semibold text-ink">
          {`${name} — True Words`}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink-muted">{`${entries.length} True Word · öğrenme sırası`}</p>
          <Link
            to={libraryPath('true-words', isDm ? profile.id : undefined)}
            className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
          >
            ✦ True Word Draft
          </Link>
          {isDm ? (
            <Button
              variant="primary"
              disabled={isTableBusy}
              title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
              onClick={() => setIsTeaching(true)}
            >
              + True Word öğret
            </Button>
          ) : null}
        </div>
      </div>

      {openDraft.status === 'loading' ? (
        <Spinner label="Draft yükleniyor…" className="py-4" />
      ) : null}
      {draft !== null ? (
        <OpenDraftPanel draft={draft} wordsById={wordsById} ownerName={name} />
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Henüz True Word öğrenilmedi.
        </p>
      ) : (
        <ol
          aria-label="Bilinen True Words"
          className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-3 gap-y-4"
        >
          {entries.map(({ record, word }) => {
            const isSelected = record.id === selectedId
            return (
              // The tile opens the word's details, so it lifts under the pointer or the focus (design D10).
              <li
                key={record.id}
                className="relative transition hover:z-3 has-focus-visible:z-3 motion-safe:hover:-translate-y-1.25 motion-safe:hover:scale-[1.02] motion-safe:has-focus-visible:-translate-y-1.25"
              >
                <TrueWordTile
                  word={word}
                  isActive={record.active}
                  isPictureOnly
                  isSelected={isSelected}
                />
                {/* The whole tile opens the details; the tile itself stays readable as an article. */}
                <button
                  type="button"
                  onClick={() => onSelect(record.id)}
                  aria-label={`${word.name}: ayrıntılar`}
                  aria-current={isSelected || undefined}
                  className="absolute inset-0 rounded-2xl hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                />
              </li>
            )
          })}
        </ol>
      )}

      {isTeaching ? (
        <TeachWordDialog
          student={profile}
          words={words}
          known={known}
          onClose={() => setIsTeaching(false)}
        />
      ) : null}
    </section>
  )
}

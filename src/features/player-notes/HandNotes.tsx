import { useId, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { DmOnly } from '@/features/users/DmOnly'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import type { Subscription } from '@/lib/firestore/subscription'
import { useSavedField } from '@/lib/useSavedField'

import type { NoteSave } from './api'
import { useDmNote, useNoteActions } from './playerNotesContext'
import { hasNoteText, type Note, NOTE_LIMITS } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/** "9 Kas 14:32": an absolute time, as the İşlem Logu shows it, so the line needs no ticking timer. */
const editedAtFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export type HandNotesProps = {
  /** The player whose notes these are. */
  profile: UserProfile
  /** That player's note, live. The hand screen subscribes to it once, for the tab's marker too. */
  playerNote: Subscription<Note | null>
}

/**
 * The hand's Notlar tab. The player note is editable by its player and the DM, and read-only for everyone else.
 * The DM note shows only to the DM: its section is inside `<DmOnly>`, so a player's device never mounts it and never
 * asks for the DM note (spec: player-notes).
 */
export function HandNotes({ profile, playerNote }: HandNotesProps) {
  const auth = useAuth()
  const isDm = useIsDm()
  const { savePlayerNote } = useNoteActions()
  const isOwner = auth.status === 'signedIn' && auth.user.uid === profile.id

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <NoteSection
        title="Oyuncu notu"
        note={playerNote}
        canEdit={isDm || isOwner}
        placeholder="Oyuncunun genel notlarını buraya yaz…"
        loadError="Notlar yüklenemedi."
        save={(save) => savePlayerNote({ ...save, uid: profile.id })}
      />
      <DmOnly>
        <DmNoteSection uid={profile.id} />
      </DmOnly>
    </div>
  )
}

/** The DM note about `uid`. Only rendered for the DM; it alone reads a DM note. */
function DmNoteSection({ uid }: { uid: string }) {
  const note = useDmNote(uid)
  const { saveDmNote } = useNoteActions()
  return (
    <NoteSection
      title="DM notu"
      hint="🔒 Yalnızca DM görür"
      note={note}
      canEdit
      placeholder="Yalnızca senin göreceğin notlar…"
      loadError="DM notu yüklenemedi."
      save={(save) => saveDmNote({ ...save, uid })}
      className="border-dashed border-gold"
    />
  )
}

type NoteSectionProps = {
  title: string
  /** A line under the title, for example who can see the note. */
  hint?: string
  note: Subscription<Note | null>
  canEdit: boolean
  placeholder: string
  /** The Turkish message when the note cannot be read. */
  loadError: string
  /** Saves the note's text as the signed-in user. */
  save: (save: Omit<NoteSave, 'uid'>) => Promise<void>
  className?: string
}

function NoteSection({
  title,
  hint,
  note,
  canEdit,
  placeholder,
  loadError,
  save,
  className,
}: NoteSectionProps) {
  const ids = useId()
  const titleId = `${ids}-title`
  const hintId = hint === undefined ? undefined : `${ids}-hint`

  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex flex-col gap-2 rounded-xl border border-line bg-pane p-4', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="font-semibold text-ink">
          {canEdit && note.status === 'ready' ? (
            <label htmlFor={`${ids}-text`}>{title}</label>
          ) : (
            title
          )}
        </h2>
        {hint === undefined ? null : (
          <p id={hintId} className="text-sm text-gold">
            {hint}
          </p>
        )}
      </div>
      {note.status === 'loading' ? (
        <Spinner label="Not yükleniyor…" className="py-4" />
      ) : note.status === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink">
          {loadError}
        </p>
      ) : (
        <>
          {canEdit ? (
            <NoteEditor
              id={`${ids}-text`}
              stored={note.data?.text ?? ''}
              placeholder={placeholder}
              describedBy={hintId}
              save={save}
            />
          ) : (
            <p className="text-sm whitespace-pre-line text-ink">
              {note.data !== null && hasNoteText(note.data) ? note.data.text : 'Not yok.'}
            </p>
          )}
          {note.data === null ? null : <LastEdited note={note.data} />}
        </>
      )}
    </section>
  )
}

type NoteEditorProps = {
  id: string
  stored: string
  placeholder: string
  describedBy: string | undefined
  save: (save: Omit<NoteSave, 'uid'>) => Promise<void>
}

/** The note's field, saved when it loses focus. Live changes never replace what the user is typing. */
function NoteEditor({ id, stored, placeholder, describedBy, save }: NoteEditorProps) {
  const auth = useAuth()
  const [hasFailed, setHasFailed] = useState(false)
  const field = useSavedField(
    stored,
    (text) => {
      if (auth.status !== 'signedIn') return Promise.resolve()
      setHasFailed(false)
      return save({ text, by: auth.user.uid })
    },
    () => setHasFailed(true),
  )
  return (
    <>
      <textarea
        id={id}
        value={field.value}
        maxLength={NOTE_LIMITS.text}
        rows={6}
        placeholder={placeholder}
        aria-describedby={describedBy}
        onFocus={field.onFocus}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        className={fieldClasses}
      />
      {hasFailed ? (
        <p role="alert" className="text-sm text-danger-ink">
          Not kaydedilemedi.
        </p>
      ) : null}
    </>
  )
}

/** "Son düzenleyen: Ayla · 9 Kas 14:32", or "kaydediliyor…" while the server time is pending. */
function LastEdited({ note }: { note: Note }) {
  const profiles = useProfiles()
  const editor =
    profiles.status === 'ready'
      ? profiles.data.find((profile) => profile.id === note.updatedBy)
      : undefined
  const name = editor ? profileName(editor) : 'Bir oyuncu'
  const when =
    note.updatedAt === null ? 'kaydediliyor…' : editedAtFormat.format(note.updatedAt.toDate())
  return (
    <p className="text-xs text-ink-muted">
      Son düzenleyen: {name} · {when}
    </p>
  )
}

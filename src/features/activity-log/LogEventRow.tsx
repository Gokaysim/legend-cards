import { useCardsById } from '@/features/cards/cardsContext'
import { useTrueWords } from '@/features/true-words/trueWordsContext'
import { RoleTag } from '@/features/users/RoleTag'
import type { UserProfile } from '@/features/users/schema'

import { useHolding } from './activityLogContext'
import type { LogEvent } from './events'
import { describeEvent, type NameOf } from './eventText'

const timeFormat = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

/** "19:42" in the device's time zone. */
function formatEventTime(at: Date): string {
  return timeFormat.format(at)
}

/** The name an import shows in the log, in place of a user's. */
export const IMPORT_ACTOR = 'Import'

export type LogEventRowProps = {
  event: LogEvent
  nameOf: NameOf
  /** The profile of the user who did it, to mark the DM. `undefined` when unknown. */
  actor: UserProfile | undefined
}

/**
 * One event: its time ("şimdi" while the server time is pending), who did it with the DM marked, and the Turkish
 * sentence, card names marked as English. A transfer with one side missing from the records reads that side. A
 * pack also lists the cards it showed, and a True Word draft the words it showed. A definition change lists its
 * changed fields or the published definition, an import the names it added, and the DM's work on drafts is marked as
 * visible to the DM only.
 */
export function LogEventRow({ event, nameOf, actor }: LogEventRowProps) {
  const other = useHolding(event.kind === 'transferred' ? event.missingHoldingId : null)
  const sentence = describeEvent(event, nameOf, other.status === 'ready' ? other.data : null)
  const at = event.at?.toDate() ?? null
  const cardsById = useCardsById()
  const words = useTrueWords()
  const shown =
    event.kind === 'pack' && cardsById.status === 'ready'
      ? event.pack.offered.flatMap((cardId) => cardsById.data.get(cardId)?.name ?? [])
      : event.kind === 'wordDraft' && words.status === 'ready'
        ? event.draft.offered.map(
            (wordId) => words.data.find((word) => word.id === wordId)?.name ?? wordId,
          )
        : []
  const isDmOnly = (event.kind === 'definition' || event.kind === 'import') && !event.change.public

  return (
    <li className="flex gap-3 py-2 text-sm">
      {at === null ? (
        <span className="w-12 shrink-0 text-ink-muted">şimdi</span>
      ) : (
        <time dateTime={at.toISOString()} className="w-12 shrink-0 text-ink-muted tabular-nums">
          {formatEventTime(at)}
        </time>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
          <span className="break-words">{event.by === null ? IMPORT_ACTOR : nameOf(event.by)}</span>
          {actor?.role === 'dm' ? <RoleTag role="dm" /> : null}
          {isDmOnly ? (
            <span className="text-xs font-normal text-ink-muted">🔒 Yalnızca DM</span>
          ) : null}
        </p>
        <p className="break-words text-ink">
          {sentence.parts.map((part, index) =>
            typeof part === 'string' ? (
              part
            ) : (
              <span key={index} lang="en" className="font-semibold">
                {part.card}
              </span>
            ),
          )}
          {sentence.reason !== null ? (
            <span className="text-ink-muted"> · {sentence.reason}</span>
          ) : null}
        </p>
        {sentence.lines?.map((line, index) => (
          <p
            key={index}
            lang={index === 0 ? undefined : 'en'}
            className="text-xs break-words whitespace-pre-line text-ink-muted"
          >
            {line}
          </p>
        ))}
        {sentence.names && sentence.names.length > 0 ? (
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer">Eklenenler ({sentence.names.length})</summary>
            <p lang="en" className="break-words">
              {sentence.names.join(', ')}
            </p>
          </details>
        ) : null}
        {shown.length > 0 ? (
          <p className="text-xs break-words text-ink-muted">
            Sunulan: <span lang="en">{shown.join(', ')}</span>
          </p>
        ) : null}
      </div>
    </li>
  )
}

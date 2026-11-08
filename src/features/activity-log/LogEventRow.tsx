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

export type LogEventRowProps = {
  event: LogEvent
  nameOf: NameOf
  /** The profile of the user who did it, to mark the DM. `undefined` when unknown. */
  actor: UserProfile | undefined
}

/**
 * One event: its time ("şimdi" while the server time is pending), who did it with the DM marked, and the Turkish
 * sentence, card names marked as English. A transfer with one side missing from the records reads that side.
 */
export function LogEventRow({ event, nameOf, actor }: LogEventRowProps) {
  const other = useHolding(event.kind === 'transferred' ? event.missingHoldingId : null)
  const sentence = describeEvent(event, nameOf, other.status === 'ready' ? other.data : null)
  const at = event.at?.toDate() ?? null

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
          <span className="break-words">{nameOf(event.by)}</span>
          {actor?.role === 'dm' ? <RoleTag role="dm" /> : null}
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
      </div>
    </li>
  )
}

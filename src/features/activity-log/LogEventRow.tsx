import { Fragment } from 'react'
import { Link } from 'react-router'

import { cardHistoryPath, handPath } from '@/app/screens'
import { useHandCardsById } from '@/features/cards/cardsContext'
import { useSetIndex } from '@/features/sets/setsContext'
import { useTrueWords } from '@/features/true-words/trueWordsContext'
import { RoleTag } from '@/features/users/RoleTag'
import type { UserProfile } from '@/features/users/schema'
import { formatTime } from '@/lib/days'

import { useHolding } from './activityLogContext'
import type { LogEvent } from './events'
import { describeEvent, type NameOf, type SentencePart } from './eventText'

/** The name an import shows in the log, in place of a user's. */
export const IMPORT_ACTOR = 'Import'

export type LogEventRowProps = {
  event: LogEvent
  nameOf: NameOf
  /** Whether the user with this uid has a profile, and so a hand to link to. */
  hasProfile: (uid: string) => boolean
  /** Whether the viewer may open the Kart geçmişi of the card with this ID (`useCardPageAccess`). */
  canOpenCard: (cardId: string) => boolean
  /** The profile of the user who did it, to mark the DM. `undefined` when unknown. */
  actor: UserProfile | undefined
}

/** The log's links look like the Kütüphane table's card links (design D6 of link-log-players-and-cards). */
const LINK_CLASSES = 'hover:text-gold hover:underline'

/** A player's name, a link to their hand when they have a profile (spec: activity-log). */
function PlayerName({ uid, name, isLinked }: { uid: string; name: string; isLinked: boolean }) {
  return isLinked ? (
    <Link to={handPath(uid)} className={LINK_CLASSES}>
      {name}
    </Link>
  ) : (
    name
  )
}

/** A card's name, marked as English, a link to its Kart geçmişi when the viewer may open it. */
function CardName({
  name,
  cardId,
  canOpenCard,
  className,
}: {
  name: string
  cardId: string | null
  canOpenCard: (cardId: string) => boolean
  className?: string
}) {
  return (
    <span lang="en" className={className}>
      {cardId !== null && canOpenCard(cardId) ? (
        <Link to={cardHistoryPath({ id: cardId })} className={LINK_CLASSES}>
          {name}
        </Link>
      ) : (
        name
      )}
    </span>
  )
}

/**
 * One event: its time ("şimdi" while the server time is pending), who did it with the DM marked, and the Turkish
 * sentence, card names marked as English. A transfer with one side missing from the records reads that side. A
 * pack also lists the cards it showed, and a True Word draft the words it showed. A set edit lists its changed fields,
 * and a set import the names it added.
 */
export function LogEventRow({ event, nameOf, hasProfile, canOpenCard, actor }: LogEventRowProps) {
  const other = useHolding(event.kind === 'transferred' ? event.missingHoldingId : null)
  const { setName } = useSetIndex()
  const sentence = describeEvent(
    event,
    { nameOf, setName },
    other.status === 'ready' ? other.data : null,
  )
  const at = event.at?.toDate() ?? null
  const cardsById = useHandCardsById()
  const words = useTrueWords()
  // A pack's cards link to their pages; a draft's True Words have none (spec: activity-log).
  const shown: { name: string; cardId: string | null }[] =
    event.kind === 'pack' && cardsById.status === 'ready'
      ? event.pack.offered.flatMap((cardId) => {
          const card = cardsById.data.get(cardId)
          return card ? [{ name: card.name, cardId }] : []
        })
      : event.kind === 'wordDraft' && words.status === 'ready'
        ? event.draft.offered.map((wordId) => ({
            name: words.data.find((word) => word.id === wordId)?.name ?? wordId,
            cardId: null,
          }))
        : []
  const renderPart = (part: SentencePart, index: number) =>
    typeof part === 'string' ? (
      part
    ) : 'card' in part ? (
      <CardName
        key={index}
        name={part.card}
        cardId={part.cardId}
        canOpenCard={canOpenCard}
        className="font-semibold"
      />
    ) : (
      <span key={index}>
        <PlayerName uid={part.player} name={part.name} isLinked={hasProfile(part.player)} />
        {part.suffix}
      </span>
    )

  return (
    <li className="flex gap-3 py-2 text-sm">
      {at === null ? (
        <span className="w-12 shrink-0 text-ink-muted">şimdi</span>
      ) : (
        <time dateTime={at.toISOString()} className="w-12 shrink-0 text-ink-muted tabular-nums">
          {formatTime(at)}
        </time>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
          <span className="break-words">
            {event.by === null ? (
              IMPORT_ACTOR
            ) : (
              <PlayerName uid={event.by} name={nameOf(event.by)} isLinked={actor !== undefined} />
            )}
          </span>
          {actor?.role === 'dm' ? <RoleTag role="dm" /> : null}
        </p>
        <p className="break-words text-ink">
          {sentence.parts.map(renderPart)}
          {sentence.reason !== null ? (
            <span className="text-ink-muted"> · {sentence.reason}</span>
          ) : null}
        </p>
        {sentence.lines?.map((line, index) => (
          <p key={index} className="text-xs break-words whitespace-pre-line text-ink-muted">
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
            Sunulan:{' '}
            {shown.map((item, index) => (
              <Fragment key={index}>
                {index > 0 ? ', ' : null}
                <CardName name={item.name} cardId={item.cardId} canOpenCard={canOpenCard} />
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  )
}

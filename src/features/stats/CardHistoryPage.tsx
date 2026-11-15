import { type ReactNode, useId, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { Pill } from '@/components/ui/Pill'
import { Spinner } from '@/components/ui/Spinner'
import { type Deck, isInDeck, useCardsById } from '@/features/cards/cardsContext'
import { CardFace } from '@/features/cards/CardFace'
import { NO_VALUE } from '@/features/cards/display'
import type { Card } from '@/features/cards/schema'
import { statusLabel } from '@/features/cards/status'
import { STATUS_LABELS } from '@/features/definitions/status'
import { useCardStatuses } from '@/features/hands/cardStatus'
import { holdingInfo } from '@/features/hands/holdingInfo'
import { useOpenHoldings } from '@/features/hands/holdingsContext'
import { useSetIndex } from '@/features/sets/setsContext'
import { useIsDm } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { formatTime, groupByDay } from '@/lib/days'

import { BackLink } from './BackLink'
import { cardStats, type CardRecords, historyRows } from './cardHistory'
import { describeHistoryRow, type HistoryTone } from './historyText'
import { StatsTile, StatsTiles } from './StatsTile'
import { useStatsNames } from './statsNames'
import { useCardRecords } from './statsContext'
import {
  heldText,
  holderNamesText,
  lastUseText,
  lpPaidText,
  reachedText,
  takenText,
} from './tileText'

/** The dot before each row of the Geçmiş list, in the color of what happened. */
const TONE_DOTS: Record<HistoryTone, string> = {
  given: 'border-gold bg-gold',
  used: 'border-green bg-green',
  discarded: 'border-danger-ink bg-danger-ink',
  transferred: 'border-ink-muted bg-ink-muted',
  seen: 'border-ink-muted bg-transparent',
}

const BOX_CLASSES = 'rounded-xl border border-line bg-pane p-4'

/**
 * The status pill: "Taslak" or "Kaldırıldı" for a draft or a retired card, else the Kart kütüphanesi's Durum text. A
 * card that is nowhere (a Cursed card no one holds) has none.
 */
function StatusPill({ card }: { card: Card }) {
  const statuses = useCardStatuses()
  const status = statuses?.get(card.id)
  const text =
    card.status !== 'active'
      ? STATUS_LABELS[card.status]
      : status === undefined
        ? null
        : statusLabel(card, status)
  if (text === null || text === NO_VALUE) return null
  return (
    <span
      data-status-pill=""
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        card.status !== 'active'
          ? 'border-ink-muted text-ink-muted'
          : status?.inPool && status.holderNames.length === 0
            ? 'border-green text-green'
            : 'border-gold text-ink',
      )}
    >
      {text}
    </span>
  )
}

type CardHistoryProps = { card: Card; records: CardRecords; now: number }

/** The page of a card the viewer may see, once its records are read. */
function CardHistory({ card, records, now }: CardHistoryProps) {
  const ids = useId()
  const { setName } = useSetIndex()
  const names = useStatsNames()
  const stats = useMemo(() => cardStats(card.id, records, now), [card.id, records, now])
  const rows = useMemo(() => historyRows(card.id, records), [card.id, records])
  const groups = groupByDay(rows)
  const held = heldText(stats)
  const lastUse = lastUseText(stats)
  const info = holdingInfo(card, card.cost, setName)

  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="mx-auto flex w-full max-w-75 min-w-50 shrink-0 flex-col gap-3 sm:mx-0 sm:w-70">
        <CardFace card={card} isRevealed />
      </div>

      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4.5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 lang="en" className="text-[28px] font-semibold break-words text-ink">
              {card.name}
            </h1>
            <StatusPill card={card} />
          </div>
          <ul aria-label="Kart bilgileri" className="flex flex-wrap gap-1.5">
            {info.map((label) => (
              <li key={label.label} className="max-w-full">
                <Pill tone={label.tone} isMuted={label.isMuted}>
                  {label.label}
                </Pill>
              </li>
            ))}
          </ul>
        </div>

        <StatsTiles label="Kart istatistikleri">
          <StatsTile
            label="Ele geçti"
            value={stats.reached.total}
            sub={reachedText(stats.reached)}
          />
          <StatsTile label="Kullanıldı" value={stats.used} sub={lpPaidText(stats)} />
          <StatsTile label="Discard" labelLang="en" value={stats.discarded} sub="DM attı" />
          <StatsTile label="Transfer" value={stats.transferred} sub="el değiştirdi" />
          <StatsTile
            label="Pakette göründü"
            value={stats.shown}
            sub={takenText(stats, card.kind === 'cursed')}
          />
          <StatsTile
            label="Farklı oyuncu"
            value={stats.holders.length}
            sub={holderNamesText(stats.holders, names.nameOf)}
          />
          <StatsTile label="Elde kaldı" value={held.value} sub={held.sub} />
          <StatsTile label="Son kullanım" value={lastUse.value} sub={lastUse.sub} isSmallValue />
        </StatsTiles>

        <section
          aria-labelledby={`${ids}-history`}
          className={cn(BOX_CLASSES, 'flex flex-col gap-3.5')}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id={`${ids}-history`} className="text-lg font-semibold text-ink">
              Geçmiş
            </h2>
            {rows.length > 0 ? (
              <span className="text-[13px] text-ink-muted">{rows.length} olay</span>
            ) : null}
          </div>
          {stats.holdings === 0 ? (
            <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-control-line px-4 py-10 text-center">
              <p className="text-[15px] font-semibold text-ink">
                Bu kart henüz kimsenin eline geçmedi.
              </p>
              <p className="text-[13px] text-ink-muted">
                Verildiğinde, çekildiğinde ya da bir paketten seçildiğinde burada görünür.
              </p>
            </div>
          ) : null}
          {groups.length > 0 ? (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`${ids}-${group.key}`}
                  className="flex flex-col gap-2"
                >
                  <h3
                    id={`${ids}-${group.key}`}
                    className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
                  >
                    {group.label}
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {group.items.map((row) => {
                      const text = describeHistoryRow(row, { ...names, setName, card })
                      const at = row.at?.toDate() ?? null
                      return (
                        <li
                          key={row.key}
                          data-tone={text.tone}
                          className="flex items-start gap-3 rounded-lg border border-line bg-pane-raised px-3 py-2.5"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'mt-1 size-2.5 shrink-0 rounded-full border-2',
                              TONE_DOTS[text.tone],
                            )}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="text-sm font-medium break-words text-ink">{text.text}</p>
                            {text.details !== null ? (
                              <p className="text-xs break-words text-ink-muted">{text.details}</p>
                            ) : null}
                          </div>
                          {at === null ? (
                            <span className="shrink-0 text-xs text-ink-muted">şimdi</span>
                          ) : (
                            <time
                              dateTime={at.toISOString()}
                              className="shrink-0 text-xs text-ink-muted tabular-nums"
                            >
                              {formatTime(at)}
                            </time>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

/**
 * Whether the viewer may open the card's page (spec: card-stats, "Who opens a card's page"): the DM every card, a
 * player an active card whose "Listede görünür" is on, and a hidden or retired card while someone holds it. This is about what
 * the interface shows: the rules let every signed-in user read these records (design D8).
 */
function isOpenTo(card: Card, isDm: boolean, isHeld: boolean): boolean {
  if (isDm) return true
  if (card.status === 'draft') return false
  return (card.status === 'active' && card.isInLibrary) || isHeld
}

/**
 * A card's Kart geçmişi (spec: card-stats): the card large with its labels and status, eight stat tiles, and the
 * Geçmiş list of what happened to it, grouped by day, newest first. It sits under the address of its deck's screen,
 * and counts live from the card's holdings, draws and pack openings while it is open.
 */
export function CardHistoryPage({ deck }: { deck: Deck }) {
  const { cardId = '' } = useParams()
  const isDm = useIsDm()
  const cardsById = useCardsById()
  const holdings = useOpenHoldings()
  const names = useStatsNames()
  const back = <BackLink screen={deck === 'cursed' ? 'cursed-deck' : 'library'} />

  const card = cardsById.status === 'ready' ? cardsById.data.get(cardId) : undefined
  const isHeld =
    holdings.status === 'ready' && holdings.data.some((holding) => holding.cardId === cardId)
  const isShown = card !== undefined && isInDeck(card, deck) && isOpenTo(card, isDm, isHeld)
  const records = useCardRecords(isShown ? cardId : null)
  // Read once, when the page opens: the page does not tick (design D7).
  const [now] = useState(() => Date.now())

  const frame = (content: ReactNode) => (
    <section className="flex flex-col gap-5">
      {back}
      {content}
    </section>
  )

  if (cardsById.status === 'error' || holdings.status === 'error' || records.status === 'error') {
    return frame(
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        Kartın geçmişi yüklenemedi.
      </p>,
    )
  }
  if (cardsById.status === 'loading' || holdings.status === 'loading') {
    return frame(<Spinner label="Kart geçmişi yükleniyor…" className="py-12" />)
  }
  if (!isShown) {
    return frame(<p className={cn(BOX_CLASSES, 'p-6 text-ink-muted')}>Kart bulunamadı.</p>)
  }
  if (records.status === 'loading' || names.status === 'loading') {
    return frame(<Spinner label="Kart geçmişi yükleniyor…" className="py-12" />)
  }
  return frame(<CardHistory card={card} records={records.data} now={now} />)
}

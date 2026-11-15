import { type ReactNode, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { Spinner } from '@/components/ui/Spinner'
import { setMascotStem, useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { Mascot } from '@/features/art/Mascot'
import { NeutralCardBack } from '@/features/art/NeutralCardBack'
import { usePicture } from '@/features/art/usePicture'
import { useDeckCards, useDeckDefinitions } from '@/features/cards/cardsContext'
import { useCardStatuses } from '@/features/hands/cardStatus'
import { type CardSet, PACK_LAYOUT_LABELS } from '@/features/sets/schema'
import { useSetIndex, useSets } from '@/features/sets/setsContext'
import { useIsDm } from '@/features/users/usersContext'

import { BackLink } from './BackLink'
import { SetCardTable } from './SetCardTable'
import { setCardRows, setCards, type SetTiles, setTiles } from './setStats'
import { StatsTile, StatsTiles } from './StatsTile'
import { useAllRecords } from './statsContext'
import { lpPaidText, reachedText } from './tileText'

const ALERT_CLASSES = 'rounded-xl border border-danger-line bg-pane p-4 text-danger-ink'

/** The set's cardback at the top of its page, or the neutral back while it has none. */
function SetCardback({ set }: { set: CardSet }) {
  const picture = usePicture(useArt().backUrl(set.code))
  return picture.src === null ? (
    <NeutralCardBack className="w-16 shrink-0 gap-0 rounded-lg border p-0 [&>span]:text-xl" />
  ) : (
    <CardPicture
      src={picture.src}
      alt={`${set.name} cardback`}
      onError={picture.onError}
      className="w-16 shrink-0 rounded-lg"
    />
  )
}

/** "1 taslak · 1 🔒 DM", or "aktif" when every counted card is active and listed for all. */
function markedText({ marked }: SetTiles): string {
  const parts = [
    marked.draft > 0 ? `${marked.draft} taslak` : null,
    marked.hidden > 0 ? `${marked.hidden} 🔒 DM` : null,
    marked.retired > 0 ? `${marked.retired} kaldırıldı` : null,
  ].filter((part) => part !== null)
  return parts.length === 0 ? 'aktif' : parts.join(' · ')
}

/** The tiles and the table of a stored set, counted live from every holding and pack opening. */
function SetStats({ set }: { set: CardSet }) {
  const isDm = useIsDm()
  const index = useSetIndex()
  // The DM counts every card of the set, whatever its status; a player the active cards that are not DM-only, as the
  // Setler screen counts them (spec: card-stats, "The cards a set's page counts").
  const definitions = useDeckDefinitions('legend')
  const visible = useDeckCards('legend')
  const cards = isDm ? definitions : visible
  const statuses = useCardStatuses()
  const records = useAllRecords()
  // Read once, when the page opens: the page does not tick (design D7).
  const [now] = useState(() => Date.now())

  const counted = useMemo(
    () => (cards.status === 'ready' ? setCards(cards.data, set, index) : null),
    [cards, set, index],
  )
  const rows = useMemo(
    () =>
      counted !== null && statuses !== null && records.status === 'ready'
        ? setCardRows(counted, records.data, statuses, now)
        : null,
    [counted, statuses, records, now],
  )
  const tiles = useMemo(
    () =>
      rows !== null && records.status === 'ready'
        ? setTiles(rows, set, records.data.packs, index)
        : null,
    [rows, records, set, index],
  )

  if (cards.status === 'error' || records.status === 'error') {
    return (
      <p role="alert" className={ALERT_CLASSES}>
        Setin istatistikleri yüklenemedi.
      </p>
    )
  }
  if (rows === null || tiles === null) {
    return <Spinner label="Set istatistikleri yükleniyor…" className="py-12" />
  }
  return (
    <>
      <StatsTiles label="Set istatistikleri">
        <StatsTile label="Kart" value={tiles.cards} sub={markedText(tiles)} />
        <StatsTile label="Havuzda" value={tiles.inPool} sub="çekilebilir" />
        <StatsTile label="Elde" value={tiles.held} sub="şu an" />
        <StatsTile label="Ele geçti" value={tiles.reached.total} sub={reachedText(tiles.reached)} />
        <StatsTile label="Kullanıldı" value={tiles.used} sub={lpPaidText(tiles)} />
        <StatsTile
          label="Discard"
          labelLang="en"
          value={tiles.discarded}
          sub={`${tiles.transferred} transfer`}
        />
        <StatsTile
          label="Açılan pack"
          value={tiles.packs.total}
          sub={tiles.packs.parts.map((part) => `${part.name} ${part.count}`).join(' · ')}
        />
        <StatsTile label="Hiç ele geçmedi" value={tiles.neverHeld} sub="kart" />
      </StatsTiles>
      <SetCardTable rows={rows} />
    </>
  )
}

/**
 * A set's Set istatistikleri (spec: card-stats): its cardback, name, code and pack layout with its Cardmaker, eight
 * tiles over the cards it counts, and a sortable table of those cards. It sits under the Setler screen's address.
 */
export function SetStatsPage() {
  const { setId = '' } = useParams()
  const sets = useSets()

  const frame = (content: ReactNode) => (
    <section className="flex flex-col gap-5">
      <BackLink screen="sets" />
      {content}
    </section>
  )

  if (sets.status === 'loading') {
    return frame(<Spinner label="Set istatistikleri yükleniyor…" className="py-12" />)
  }
  if (sets.status === 'error') {
    return frame(
      <p role="alert" className={ALERT_CLASSES}>
        Setin istatistikleri yüklenemedi.
      </p>,
    )
  }
  const set = sets.data.find((stored) => stored.id === setId)
  if (set === undefined) {
    return frame(
      <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
        Böyle bir set yok.
      </p>,
    )
  }
  return frame(
    <>
      <header className="flex flex-wrap items-end justify-between gap-4.5">
        <div className="flex min-w-0 items-center gap-4">
          <SetCardback set={set} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[28px] font-semibold break-words text-ink">{set.name}</h1>
            <p className="text-sm break-words text-ink-muted">
              code: {set.code} · {PACK_LAYOUT_LABELS[set.packLayout]}
            </p>
          </div>
        </div>
        <Mascot stem={setMascotStem(set.code)} className="max-h-18 max-w-1/3 sm:max-h-28" />
      </header>
      <SetStats set={set} />
    </>,
  )
}

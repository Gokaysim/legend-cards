import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { shopScreenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useArt } from '@/features/art/artContext'
import { Mascot } from '@/features/art/Mascot'
import { useAuth } from '@/features/auth/authContext'
import { useCards } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { BackToShopsLink } from '@/features/shops/BackToShopsLink'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import {
  GOLDEN_GROUP_MASCOT,
  groupMascotStem,
  type PackDef,
  packCatalog,
  packStatus,
  PACK_PRICES,
  type SetGroup,
} from './catalog'
import { PackConfirmDialog } from './PackConfirmDialog'
import { PackTile } from './PackTile'
import { useOpenPack } from './packsContext'
import { formatAmount } from '@/features/balances/format'

/** The search parameter of an open group: a set code, or `golden` for the Golden Packs. */
const GROUP_PARAM = 'group'
/** The search parameter of the DM's chosen hand. */
const FOR_PARAM = 'for'
const GOLDEN_GROUP = 'golden'

const groupTileClasses =
  'flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-pane p-4 text-center transition-colors hover:border-gold hover:bg-pane-raised'

/**
 * The Pack Shop: Set Packs in groups per set, and Mechanic Packs with the Golden Packs group last
 * (docs/domain.md, Packs). A group's packs open on their own view, kept in the URL (`?group=`), so reloading and
 * going back work. A player opens packs into their own hand; the DM picks the hand, prefilled from `?for=`.
 * Selecting a pack opens its confirmation with the payment. While a pack is open, nothing can be opened. The shop's
 * Cardmaker stands by the title; an open group shows its own instead, by the group's title.
 */
export function PackShopPage() {
  const { label: title, mascot } = shopScreenById('pack-shop')
  const cards = useCards()
  const [params] = useSearchParams()
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={title}
        actions={<BackToShopsLink />}
        mascot={params.has(GROUP_PARAM) ? null : mascot}
      />
      {cards.status === 'loading' ? (
        <Spinner label="Kartlar yükleniyor…" className="py-12" />
      ) : cards.status === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          Kartlar yüklenemedi.
        </p>
      ) : (
        <PackShop cards={cards.data} />
      )}
    </section>
  )
}

function PackShop({ cards }: { cards: readonly Card[] }) {
  const ids = useId()
  const auth = useAuth()
  const isDm = useIsDm()
  const profiles = useProfiles()
  const openPack = useOpenPack()
  const isTableBusy = useIsTableBusy()
  const [params, setParams] = useSearchParams()
  const [confirming, setConfirming] = useState<PackDef | null>(null)
  const catalog = useMemo(() => packCatalog(cards), [cards])
  const art = useArt()

  const profileList = profiles.status === 'ready' ? profiles.data : []
  const myUid = auth.status === 'signedIn' ? auth.user.uid : null
  const requested = params.get(FOR_PARAM)
  const owner: UserProfile | undefined = isDm
    ? (profileList.find((profile) => profile.id === requested) ??
      profileList.find((profile) => profile.role !== 'dm') ??
      profileList.find((profile) => profile.id === myUid))
    : profileList.find((profile) => profile.id === myUid)

  const nameOf = (uid: string) => {
    const profile = profileList.find((candidate) => candidate.id === uid)
    return profile ? profileName(profile) : 'Bir oyuncu'
  }
  const busyNote =
    isTableBusy && openPack !== null && openPack.status === 'open'
      ? `Şu anda ${nameOf(openPack.uid)} için bir Pack açık. Seçim yapılınca yeni Pack açılabilir.`
      : isTableBusy
        ? 'Şu anda bir Pack açık. Seçim yapılınca yeni Pack açılabilir.'
        : null

  const reasonFor = (def: PackDef): string | null => {
    if (busyNote !== null) return 'Bir Pack açık: seçim bekleniyor.'
    const status = packStatus(def, cards)
    return status.canOpen ? null : status.reason
  }

  const searchWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const text = next.toString()
    return text === '' ? '' : `?${text}`
  }

  const groupKey = params.get(GROUP_PARAM)
  const setGroup = catalog.setGroups.find((group) => group.setCode === groupKey)
  const openGroup: SetGroup | null =
    setGroup ??
    (groupKey === GOLDEN_GROUP
      ? { setCode: GOLDEN_GROUP, title: 'Golden Packs', packs: [...catalog.goldenPacks] }
      : null)
  // The group's own Cardmaker, or the shop's while the group has none, as in the legacy app.
  const isGolden = openGroup?.setCode === GOLDEN_GROUP
  const groupStem = isGolden
    ? GOLDEN_GROUP_MASCOT
    : openGroup === null
      ? null
      : groupMascotStem(openGroup.setCode)
  const groupMascot =
    groupStem !== null && art.mascotUrl(groupStem) !== null
      ? groupStem
      : shopScreenById('pack-shop').mascot

  const tiles = (defs: readonly PackDef[], showPrice: boolean) =>
    defs.map((def) => (
      <PackTile
        key={def.key}
        def={def}
        showPrice={showPrice}
        disabledReason={reasonFor(def)}
        onOpen={setConfirming}
      />
    ))

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
            onChange={(event) => setParams(searchWith({ [FOR_PARAM]: event.target.value }))}
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
      {busyNote === null ? null : (
        <p
          role="status"
          className="rounded-xl border border-line bg-pane p-3 text-sm text-ink-muted"
        >
          {busyNote}
        </p>
      )}

      {openGroup !== null ? (
        <section aria-labelledby={`${ids}-group`} className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Link
                to={searchWith({ [GROUP_PARAM]: null })}
                className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
              >
                ← {shopScreenById('pack-shop').label}
              </Link>
              <h2 id={`${ids}-group`} className="text-lg font-semibold text-gold">
                {openGroup.title}
              </h2>
            </div>
            <Mascot
              stem={groupMascot}
              className={
                isGolden ? 'max-h-32 max-w-1/3 sm:max-h-40' : 'max-h-18 max-w-1/3 sm:max-h-28'
              }
            />
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tiles(openGroup.packs, true)}
          </ul>
        </section>
      ) : (
        <>
          <section aria-labelledby={`${ids}-sets`} className="flex flex-col gap-3">
            <h2 id={`${ids}-sets`} className="text-lg font-semibold text-ink">
              Set Packs
            </h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.setGroups.map((group) => (
                <li key={group.setCode}>
                  <Link
                    to={searchWith({ [GROUP_PARAM]: group.setCode })}
                    aria-label={`${group.title}: paketleri gör`}
                    className={groupTileClasses}
                  >
                    <span aria-hidden="true" className="text-3xl leading-none">
                      ♜
                    </span>
                    <span className="font-semibold break-words text-ink">{group.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby={`${ids}-mechanics`} className="flex flex-col gap-3">
            <h2 id={`${ids}-mechanics`} className="text-lg font-semibold text-ink">
              Mechanic Packs{' '}
              <span className="text-sm font-normal text-gold tabular-nums">
                {PACK_PRICES.mechanic.lp} LP / {formatAmount(PACK_PRICES.mechanic.gp)} GP
              </span>
            </h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {tiles(catalog.mechanicPacks, false)}
              <li>
                <Link
                  to={searchWith({ [GROUP_PARAM]: GOLDEN_GROUP })}
                  aria-label="Golden Packs: paketleri gör"
                  className={`${groupTileClasses} border-gold`}
                >
                  <span aria-hidden="true" className="text-3xl leading-none">
                    ✦
                  </span>
                  <span className="font-semibold text-gold">Golden Packs</span>
                </Link>
              </li>
            </ul>
          </section>
        </>
      )}

      {confirming !== null && owner !== undefined ? (
        <PackConfirmDialog
          def={confirming}
          owner={owner}
          cards={cards}
          openPackOwner={openPack?.status === 'open' ? nameOf(openPack.uid) : null}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </>
  )
}

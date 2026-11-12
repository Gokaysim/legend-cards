import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { shopScreenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useArt } from '@/features/art/artContext'
import type { SpeechLine } from '@/features/art/cardmakerSpeech'
import { CardmakerSpeechProvider } from '@/features/art/CardmakerSpeechProvider'
import { CornerCardmaker } from '@/features/art/CornerCardmaker'
import { Mascot } from '@/features/art/Mascot'
import { useAuth } from '@/features/auth/authContext'
import { useCards } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { BackToShopsLink } from '@/features/shops/BackToShopsLink'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { useWideHover } from '@/lib/useWideHover'

import {
  GOLDEN_GROUP_MASCOT,
  groupArtUrl,
  groupMascotStem,
  type PackDef,
  packCatalog,
  packStatus,
  packTitle,
  PACK_PRICES,
  type SetGroup,
} from './catalog'
import { GroupTile } from './GroupTile'
import { PackConfirmDialog } from './PackConfirmDialog'
import { GOLDEN_LINE, type PackLine, packLine } from './packLines'
import { PackTile, type PackTileVariant } from './PackTile'
import { useOpenPack } from './packsContext'
import { formatAmount } from '@/features/balances/format'

/** The search parameter of an open group: a set code, or `golden` for the Golden Packs. */
const GROUP_PARAM = 'group'
/** The search parameter of the DM's chosen hand. */
const FOR_PARAM = 'for'
const GOLDEN_GROUP = 'golden'
const GOLDEN_GROUP_TITLE = 'Golden Packs'

/** What the Cardmaker says about a tile: its own name, then v2.2.8's words (design D6). */
const speechOf = (title: string, line: PackLine | null): SpeechLine | null =>
  line === null ? null : { title, ...line }

/**
 * The Pack Shop: Set Packs in groups per set, and Mechanic Packs with the Golden Packs group last
 * (docs/domain.md, Packs). A group's packs open on their own view, kept in the URL (`?group=`), so reloading and
 * going back work. A player opens packs into their own hand; the DM picks the hand in the pack's confirmation,
 * starting at `?for=`, which keeps the last choice (design D12).
 * Selecting a pack opens its confirmation with the payment. While a pack is open, nothing can be opened. The shop's
 * Cardmaker stands by the title; an open group shows its own instead, by the group's title. On a wide window with a
 * mouse, she stands in the bottom-right corner instead (spec: card-images, design D2).
 */
export function PackShopPage() {
  const { label: title, mascot } = shopScreenById('pack-shop')
  const cards = useCards()
  const [params] = useSearchParams()
  const isCorner = useWideHover()
  const isGroupOpen = params.has(GROUP_PARAM)
  const art = useArt()
  // She speaks only where she stands in the corner (spec: cardmaker-speech).
  const canSpeak = isCorner && art.mascotUrl(mascot) !== null
  return (
    <CardmakerSpeechProvider isEnabled={canSpeak}>
      <section className="flex flex-col gap-6">
        <PageHeader
          title={title}
          actions={<BackToShopsLink />}
          mascot={isGroupOpen || isCorner ? null : mascot}
        />
        {isCorner && !isGroupOpen ? <CornerCardmaker stem={mascot} /> : null}
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
    </CardmakerSpeechProvider>
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
  const isCorner = useWideHover()

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
      ? { setCode: GOLDEN_GROUP, title: GOLDEN_GROUP_TITLE, packs: [...catalog.goldenPacks] }
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

  // Inside a group, each pack shows its short name and price. In the main view, the Mechanic Packs' price is in their
  // heading, and each speaks its line: nothing inside a group speaks, as in v2.2.8.
  const tiles = (defs: readonly PackDef[], variant: PackTileVariant) =>
    defs.map((def) => (
      <PackTile
        key={def.key}
        def={def}
        variant={variant}
        disabledReason={reasonFor(def)}
        onOpen={setConfirming}
        speech={variant === 'shop' ? speechOf(packTitle(def), packLine(def)) : null}
      />
    ))

  return (
    <>
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
            {isCorner ? null : (
              <Mascot
                stem={groupMascot}
                className={
                  isGolden ? 'max-h-32 max-w-1/3 sm:max-h-40' : 'max-h-18 max-w-1/3 sm:max-h-28'
                }
              />
            )}
          </div>
          {isCorner ? (
            <CornerCardmaker stem={groupMascot} size={isGolden ? 'gold' : 'shop'} />
          ) : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tiles(openGroup.packs, 'group')}
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
                <GroupTile
                  key={group.setCode}
                  to={searchWith({ [GROUP_PARAM]: group.setCode })}
                  title={group.title}
                  pictureUrl={groupArtUrl(art, group)}
                />
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
              {tiles(catalog.mechanicPacks, 'shop')}
              <GroupTile
                to={searchWith({ [GROUP_PARAM]: GOLDEN_GROUP })}
                title={GOLDEN_GROUP_TITLE}
                pictureUrl={groupArtUrl(art, { packs: catalog.goldenPacks })}
                isGolden
                speech={speechOf(GOLDEN_GROUP_TITLE, GOLDEN_LINE)}
              />
            </ul>
          </section>
        </>
      )}

      {confirming !== null && owner !== undefined ? (
        <PackConfirmDialog
          def={confirming}
          owner={owner}
          choices={isDm ? profileList : []}
          // Replaced, not pushed: picking a hand in the dialog is no step to go back to.
          onOwnerChange={(uid) => setParams(searchWith({ [FOR_PARAM]: uid }), { replace: true })}
          cards={cards}
          openPackOwner={openPack?.status === 'open' ? nameOf(openPack.uid) : null}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </>
  )
}

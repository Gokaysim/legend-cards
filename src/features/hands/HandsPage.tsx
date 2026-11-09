import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'

import { handPath, packShopPath, screenById } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { useCardsById } from '@/features/cards/cardsContext'
import { DrawButtons } from '@/features/draws/DrawButtons'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { TableBusyNote } from '@/features/table/TableBusyNote'
import { useIsTableBusy } from '@/features/table/tableContext'
import { DmOnly } from '@/features/users/DmOnly'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useCurrentProfile, useIsDm, useProfiles } from '@/features/users/usersContext'

import { handEntries } from './handEntries'
import { GiveCardDialog } from './GiveCardDialog'
import { HandSummary } from './HandSummary'
import { HandView } from './HandView'
import { HoldingDialog } from './HoldingDialog'
import { useOpenHoldings } from './holdingsContext'

/**
 * "Oyuncu elleri" from the menu: opens a hand, replacing this URL. A player gets their own hand. The DM gets the
 * first player of the "Oyuncular" list who is not the DM, or their own hand when there is none.
 */
export function HandsPage() {
  const auth = useAuth()
  const currentProfile = useCurrentProfile()
  const profiles = useProfiles()

  if (auth.status !== 'signedIn') return null
  if (currentProfile.status === 'loading' || profiles.status === 'loading') {
    return <Spinner label="El açılıyor…" className="py-12" />
  }
  const isDm = currentProfile.status === 'ready' && currentProfile.data?.role === 'dm'
  const firstPlayer =
    isDm && profiles.status === 'ready'
      ? profiles.data.find((profile) => profile.role !== 'dm')
      : undefined
  return <Navigate to={handPath(firstPlayer?.id ?? auth.user.uid)} replace />
}

/** One player's hand at `/hands/:uid`. */
export function PlayerHandPage() {
  const { uid = '' } = useParams()
  const auth = useAuth()
  const profiles = useProfiles()
  const title = screenById('hands').label

  if (profiles.status === 'loading') {
    return <Spinner label="Oyuncular yükleniyor…" className="py-12" />
  }
  if (profiles.status === 'error') {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader title={title} />
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          Oyuncular yüklenemedi.
        </p>
      </section>
    )
  }
  const profile = profiles.data.find((candidate) => candidate.id === uid)
  if (!profile) {
    // Right after the first sign-in, the own profile is still being created.
    if (auth.status === 'signedIn' && auth.user.uid === uid) {
      return <Spinner label="Profil hazırlanıyor…" className="py-12" />
    }
    return (
      <section className="flex flex-col gap-6">
        <PageHeader title={title} />
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Böyle bir oyuncu yok.
        </p>
      </section>
    )
  }
  // Keyed by player, so switching hands starts with a fresh view and no open dialog.
  return <HandScreen key={profile.id} profile={profile} />
}

function HandScreen({ profile }: { profile: UserProfile }) {
  const [isGiving, setIsGiving] = useState(false)
  const isTableBusy = useIsTableBusy()
  const isDm = useIsDm()
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={`${profileName(profile)} — Kart Eli`}
        actions={
          <>
            <TableBusyNote />
            <DrawButtons owner={profile} />
            <Link
              to={packShopPath(isDm ? profile.id : undefined)}
              className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
            >
              🎁 Pack Shop
            </Link>
            <DmOnly>
              <Button
                variant="primary"
                disabled={isTableBusy}
                title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                onClick={() => setIsGiving(true)}
              >
                + Kart ver
              </Button>
            </DmOnly>
          </>
        }
      />
      <HandContent profile={profile} />
      {isGiving ? <GiveCardDialog receiver={profile} onClose={() => setIsGiving(false)} /> : null}
    </section>
  )
}

/** The hand of one player, live: the summary, the cards, and the details of the selected card. */
function HandContent({ profile }: { profile: UserProfile }) {
  const holdings = useOpenHoldings()
  const cardsById = useCardsById()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const entries = useMemo(
    () =>
      holdings.status === 'ready' && cardsById.status === 'ready'
        ? handEntries(holdings.data, cardsById.data, profile.id)
        : null,
    [holdings, cardsById, profile.id],
  )

  if (holdings.status === 'error' || cardsById.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        El yüklenemedi.
      </p>
    )
  }
  if (entries === null) return <Spinner label="El yükleniyor…" className="py-12" />

  // A card that left the hand (used, discarded, or given away, here or on another device) closes its details.
  const selected = entries.find((entry) => entry.holding.id === selectedId)
  return (
    <>
      <HandSummary entries={entries} profile={profile} />
      <HandView entries={entries} onSelect={setSelectedId} />
      {selected ? (
        <HoldingDialog
          key={selected.holding.id}
          entry={selected}
          holderName={profileName(profile)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  )
}

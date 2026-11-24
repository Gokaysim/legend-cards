import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'

import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { formatAmount } from '@/features/balances/format'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCustomEffects, useOpenCustomDraft } from './customDraftContext'
import {
  CUSTOM_COSTS,
  type CustomCost,
  customCardName,
  type EffectVariants,
  variantCount,
} from './draftRules'
import { DraftAmountDialog } from './DraftAmountDialog'
import { CoverPicture } from './EffectPicture'
import { OpenCustomDraft } from './OpenCustomDraft'

/** The search parameter of the user the DM drafts for. */
export const CUSTOM_DRAFT_FOR_PARAM = 'for'

/**
 * The Custom Card Draft screen (spec: custom-cards, "The Custom Card Draft screen"): a player drafts for themselves;
 * the DM chooses the user in "Kimin için", kept in the URL (`?for=`), a DM's own hand included. The chosen user's open
 * draft shows in place of the three cost choices.
 */
export function CustomDraftPage() {
  const ids = useId()
  const screen = screenById('custom-draft')
  const auth = useAuth()
  const isDm = useIsDm()
  const profiles = useProfiles()
  const variants = useCustomEffects()
  const [params, setParams] = useSearchParams()

  const profileList = profiles.status === 'ready' ? profiles.data : []
  const myUid = auth.status === 'signedIn' ? auth.user.uid : null
  const requested = params.get(CUSTOM_DRAFT_FOR_PARAM)
  const owner: UserProfile | undefined = isDm
    ? (profileList.find((profile) => profile.id === requested) ??
      profileList.find((profile) => profile.role !== 'dm') ??
      profileList.find((profile) => profile.id === myUid))
    : profileList.find((profile) => profile.id === myUid)
  const openDraft = useOpenCustomDraft(owner?.id ?? '')

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={screen.label}
        description="Rastgele efektlerden tek kullanımlık bir Custom Card yap."
        mascot={screen.mascot}
        mascotPlacement="corner"
      />

      {isDm ? (
        <div className="flex max-w-sm flex-col gap-1">
          <label htmlFor={`${ids}-for`} className="text-sm font-medium text-ink">
            Kimin için
          </label>
          <select
            id={`${ids}-for`}
            value={owner?.id ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              next.set(CUSTOM_DRAFT_FOR_PARAM, event.target.value)
              setParams(next)
            }}
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

      {owner === undefined ? null : variants.status === 'error' || openDraft.status === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          Custom Card Draft yüklenemedi.
        </p>
      ) : variants.status === 'loading' || openDraft.status === 'loading' ? (
        <Spinner label="Custom Card Draft yükleniyor…" className="py-12" />
      ) : openDraft.data !== null ? (
        <OpenCustomDraft
          draft={openDraft.data}
          variants={variants.data}
          ownerName={profileName(owner)}
        />
      ) : (
        <CostChoices owner={owner} variants={variants.data} />
      )}
    </section>
  )
}

type CostChoicesProps = { owner: UserProfile; variants: EffectVariants }

/**
 * The three choices, "1-Cost Custom Card", "3-Cost Custom Card" and "5-Cost Custom Card", each with its cover and its
 * price in LP. A choice is disabled, with the reason, when no effect text is stored at its cost, when a player cannot
 * pay it, while a pack is open, and offline. Choosing one opens the confirmation with the payment.
 */
function CostChoices({ owner, variants }: CostChoicesProps) {
  const ids = useId()
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const [chosen, setChosen] = useState<CustomCost | null>(null)
  const name = profileName(owner)

  const reasonOf = (cost: CustomCost): string | null =>
    variantCount(variants, cost) === 0
      ? 'Custom efektler yüklenmemiş.'
      : !isDm && owner.lp < cost
        ? `${formatAmount(cost)} LP gerekiyor; ${genitive(name)} ${formatAmount(owner.lp)} LP'si var.`
        : isTableBusy
          ? TABLE_BUSY_NOTE
          : !isOnline
            ? 'Bağlantı yok: draft için internet bağlantısı gerekiyor.'
            : null

  return (
    <>
      <p className="text-sm text-ink-muted">{`${name} · ${formatAmount(owner.lp)} LP`}</p>
      <ul
        aria-label="Custom Card seçenekleri"
        className="grid grid-cols-3 gap-3 sm:max-w-2xl sm:gap-5"
      >
        {CUSTOM_COSTS.map((cost) => {
          const reason = reasonOf(cost)
          const reasonId = `${ids}-${cost}-reason`
          return (
            <li key={cost} className="flex min-w-0 flex-col gap-2">
              <button
                type="button"
                disabled={reason !== null}
                aria-describedby={reason === null ? undefined : reasonId}
                onClick={() => setChosen(cost)}
                className={cn(
                  'flex min-w-0 flex-col items-stretch gap-2 rounded-xl border border-line bg-pane p-2 text-left transition-colors motion-reduce:transition-none',
                  reason === null
                    ? 'hover:border-custom-ink focus-visible:border-custom-ink'
                    : 'cursor-not-allowed opacity-60',
                )}
              >
                <CoverPicture cost={cost} />
                <span lang="en" className="text-sm font-semibold break-words text-ink">
                  {customCardName(cost)}
                </span>
                <span className="text-sm font-semibold text-gold tabular-nums">{`${formatAmount(cost)} LP`}</span>
              </button>
              {reason === null ? null : (
                <p id={reasonId} className="text-xs break-words text-ink-muted">
                  {reason}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {chosen === null ? null : (
        <DraftAmountDialog owner={owner} base={chosen} onClose={() => setChosen(null)} />
      )}
    </>
  )
}

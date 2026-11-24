import { useState } from 'react'
import { useNavigate } from 'react-router'

import { HAND_SELECTED_PARAM, handPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { formatDelta } from '@/features/balances/format'
import { draftRefundText } from '@/features/true-words/display'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCustomDraftActions } from './customDraftContext'
import {
  BASE_PICKS,
  customCardName,
  type EffectType,
  type EffectVariants,
  variantText,
} from './draftRules'
import { EffectPicture } from './EffectPicture'
import { type CustomDraftFailure, customDraftFailureMessage, toCustomDraftFailure } from './errors'
import { type CustomDraft, picksOf } from './schema'

export type OpenCustomDraftProps = {
  draft: CustomDraft
  /** The custom effect texts, live. */
  variants: EffectVariants
  /** The draft user's name. */
  ownerName: string
}

/** The draft's payment: "−3 LP" or "ücretsiz". */
function paymentText(draft: CustomDraft): string {
  return draft.paidWith === 'none' ? 'ücretsiz' : `${formatDelta(-draft.cost)} LP`
}

/**
 * An open Custom Card draft, live for everyone (spec: custom-cards, "An open Custom Card draft survives"): the picks so
 * far as small pictures, how many are made of how many are needed, and the current options with their picture, type,
 * cost and text. The draft's user and the DM pick one; there is no reroll and no skip. When no option is left, a note
 * says the custom effects are incomplete. Only the DM cancels it, with a refund, after a confirmation. The last pick
 * opens the user's hand with the new card selected. Every step waits while a pack is open. Inline, not a modal.
 */
export function OpenCustomDraft({ draft, variants, ownerName }: OpenCustomDraftProps) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const actions = useCustomDraftActions()
  const navigate = useNavigate()
  const [isCancelling, setIsCancelling] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<CustomDraftFailure | null>(null)

  const picks = picksOf(draft)
  const canAct = uid !== null && (uid === draft.uid || isDm)
  const isBlocked = isBusy || isTableBusy
  const isBonusStep = draft.bonusLeft > 0 && picks.length >= BASE_PICKS

  const run = async (action: () => Promise<void>) => {
    if (uid === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await action()
      setIsBusy(false)
    } catch (error) {
      setFailure(toCustomDraftFailure(error))
      setIsCancelling(false)
      setIsBusy(false)
    }
  }

  const pick = (type: EffectType) =>
    void run(async () => {
      const result = await actions.pick({ draftId: draft.id, type, by: uid ?? '' })
      if (result.finished) {
        const params = new URLSearchParams({ [HAND_SELECTED_PARAM]: result.holdingId })
        void navigate(`${handPath(result.uid)}?${params.toString()}`)
      }
    })
  const cancel = () => void run(() => actions.cancel({ draftId: draft.id, by: uid ?? '' }))

  return (
    <section
      aria-label={`${ownerName} için açık Custom Card draft'ı`}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-custom-ink bg-pane-raised p-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{`✧ ${customCardName(draft.base)} · ${ownerName}`}</h2>
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink tabular-nums">{`${picks.length} / ${draft.required}`}</span>
          {' farklı efekt'}
          {isBonusStep ? ` · kalan ${draft.bonusLeft} adet 1-Cost seçim` : ''}
          {` · Ödeme: ${paymentText(draft)}`}
        </p>
      </header>

      {picks.length > 0 ? (
        <ol aria-label="Seçilen efektler" className="flex flex-wrap gap-2">
          {picks.map((picked) => (
            <li
              key={picked.type}
              className="w-14 shrink-0"
              title={`${picked.type} · ${picked.cost}-Cost`}
            >
              <EffectPicture type={picked.type} cost={picked.cost} />
              <span className="sr-only">{`${picked.type} (${picked.cost}-Cost)`}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {draft.offered.length === 0 ? (
        <p className="rounded-lg border border-line bg-pane p-3 text-sm text-ink">
          Custom efektler eksik: bu adımda seçilecek efekt kalmadı. Draft, DM iptal edene kadar açık
          kalır.
        </p>
      ) : (
        <ul
          aria-label="Seçenekler"
          className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
        >
          {draft.offered.map((type) => {
            const text = variantText(variants, type, draft.offerCost)
            const label = `${type} · ${draft.offerCost}-Cost`
            return (
              <li
                key={type}
                className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-pane p-2"
              >
                <EffectPicture type={type} cost={draft.offerCost} />
                <p lang="en" className="text-sm font-semibold text-ink">
                  {label}
                </p>
                <p className="text-xs break-words text-ink-muted">{text ?? '—'}</p>
                {canAct ? (
                  <Button
                    variant="primary"
                    disabled={isBlocked || isCancelling}
                    onClick={() => pick(type)}
                    aria-label={`${label}: seç`}
                  >
                    Seç
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {!canAct ? <p className="text-sm text-ink-muted">{`${ownerName} seçiyor…`}</p> : null}
      {isTableBusy && canAct ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane p-3 text-sm text-danger-ink"
        >
          {customDraftFailureMessage(failure, ownerName)}
        </p>
      ) : null}

      {isDm && !isCancelling ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={isBlocked} onClick={() => setIsCancelling(true)}>
            ✕ İptal
          </Button>
        </div>
      ) : null}

      {isDm && isCancelling ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane p-3">
          <p className="text-sm text-ink">
            {`${draftRefundText(draft, ownerName)} Kart yapılmaz. Draft iptal edilsin mi?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={isBlocked} onClick={cancel}>
              {isBusy ? 'Kaydediliyor…' : 'Evet, iptal et ve iade et'}
            </Button>
            <Button disabled={isBusy} onClick={() => setIsCancelling(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

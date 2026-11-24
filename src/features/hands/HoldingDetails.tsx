import { hasChannel } from '@/features/cards/pool'
import { useId, useState } from 'react'
import { Link } from 'react-router'

import { cardHistoryPath } from '@/app/screens'

import { DetailsBadges } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowIcon, BinIcon, BoltIcon, PersonIcon, PowerIcon } from '@/components/ui/icons'
import { NotePaper } from '@/components/ui/NotePaper'
import { Pill } from '@/components/ui/Pill'
import { ToolSection } from '@/components/ui/ToolSection'
import { useAuth } from '@/features/auth/authContext'
import {
  confirmUseLabel,
  initialEntered,
  planUsePayment,
  type UsePayer,
} from '@/features/balances/paymentPlan'
import { UsePayment } from '@/features/balances/UsePayment'
import { CardFace } from '@/features/cards/CardFace'
import { CharacterPicker } from '@/features/characters/CharacterPicker'
import { CustomCardEffects } from '@/features/custom-draft/CustomCardEffects'
import { CustomEffectsDialog } from '@/features/custom-draft/CustomEffectsDialog'
import { useCharacterChoice } from '@/features/characters/useCharacterChoice'
import { cardFrame, type FaceGlow, faceGlow, NO_VALUE } from '@/features/cards/display'
import { useSetIndex } from '@/features/sets/setsContext'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { TableBusyNote } from '@/features/table/TableBusyNote'
import { useIsTableBusy } from '@/features/table/tableContext'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { cn } from '@/lib/cn'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useSavedField } from '@/lib/useSavedField'

import { type HoldingFailure, holdingFailureMessage, toHoldingFailure } from './errors'
import type { HandEntry } from './handEntries'
import { holdingBadges } from './holdingBadges'
import { holdingInfo } from './holdingInfo'
import { useHoldingActions } from './holdingsContext'
import { HOLDING_LIMITS } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/** The DM's tool buttons: an icon over a short label, in equal columns. */
const TOOL_BUTTON_CLASSES = 'min-h-14 flex-col gap-1 px-1 py-2 text-xs'

/** The soft light behind the face, in the color it glows (design D3). A Common card that is not active has none. */
const STAGE_LIGHTS: Partial<Record<FaceGlow, string>> = {
  active: 'from-glow-active/15',
  'active-cursed': 'from-glow-cursed/15',
  'active-blessed': 'from-glow-blessed/15',
  'reveal-rare': 'from-glow-rare/20',
  'reveal-cursed': 'from-glow-cursed/15',
  'reveal-blessed': 'from-glow-blessed/15',
}

type Step = 'idle' | 'use' | 'discard' | 'transfer'

export type HoldingDetailsProps = {
  entry: HandEntry
  /** The name of the player who holds the card. */
  holderName: string
  /** Called after the card left the hand from here: used, discarded, or given away. */
  onDone: () => void
  /**
   * `panel`, beside the hand, stacks everything under the face, and the panel shows the badges by its label. `dialog`
   * shows the badges at the top, and puts the face at the left of the rest from `sm`.
   */
  layout: 'dialog' | 'panel'
}

/**
 * The details of a held card, the same in the dialog and in the panel beside the hand, in the order of the owner's V1
 * design (spec: card-holdings; design D3 of `redesign-selected-card-panel`):
 * - the face, large, glowing as a revealed card of its kind or with its active glow, over a soft light of that color
 * - labels for its set, rarity, cost and mechanic pack; its name and text are on the face, not written again
 * - the "Kart geçmişi →" link to the card's history (spec: card-holdings, "History link in the card details")
 * - who holds it, then its note on cream paper
 * - "Kullan" across the details with a smaller "At" beside it, then the DM's tools under "DM araçları": the cost in
 *   this hand, and the active switch and giving away as equal buttons
 *
 * The holder and the DM edit the note, use the card and discard it (spec: card-holdings, "Discarding a card"); only
 * the DM switches it active, sets its cost, or gives it to another player. A use pays from the holder's LP: the price of the cost in this hand for the
 * holder, the amount the DM enters for the DM, nothing in the DM's own hand (spec: card-holdings, "Using a card"). Controls the user may not use are not shown; the rules decide. Every confirmation is
 * a step in place of the buttons. While a pack is open, the card cannot leave the hand: using, discarding and giving
 * it away wait, and the note, the active switch and the cost stay available.
 */
export function HoldingDetails({ entry, holderName, onDone, layout }: HoldingDetailsProps) {
  const { holding, card, cost, isExtraCopy } = entry
  const ids = useId()
  const { setName } = useSetIndex()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isHolder = uid !== null && uid === holding.uid
  const canUse = isDm || isHolder
  const actions = useHoldingActions()
  const isOnline = useOnlineStatus()
  const profiles = useProfiles()
  const isTableBusy = useIsTableBusy()
  const busyTitle = isTableBusy ? TABLE_BUSY_NOTE : undefined

  const [step, setStep] = useState<Step>('idle')
  const [entered, setEntered] = useState('')
  const [receiver, setReceiver] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isEditingEffects, setIsEditingEffects] = useState(false)
  const [failure, setFailure] = useState<HoldingFailure | null>(null)
  const isCustom = card.kind === 'custom'
  const showError = (error: unknown) => setFailure(toHoldingFailure(error))

  const note = useSavedField(holding.note, (value) => actions.setNote(holding.id, value), showError)
  const costOverride = useSavedField(
    holding.costOverride ?? '',
    (value) => actions.setCost(holding.id, value),
    showError,
    (value) => value.trim(),
  )

  // The use step's character, the holder's group first (spec: card-holdings, "Choosing the character of a use").
  const choice = useCharacterChoice(
    holding.uid,
    () => setFailure({ kind: 'character-unavailable' }),
    card.hasUseEffect,
  )

  const receivers =
    profiles.status === 'ready' ? profiles.data.filter((profile) => profile.id !== holding.uid) : []

  // The holder's LP pays for a use, live. Until the profiles load, the payment is not known and a use waits.
  const holderProfile =
    profiles.status === 'ready'
      ? profiles.data.find((profile) => profile.id === holding.uid)
      : undefined
  const payer: UsePayer | null = holderProfile ? { name: holderName, lp: holderProfile.lp } : null
  const payment = planUsePayment({ cost, payer, isDm, entered })
  const canConfirmUse = holderProfile !== undefined && payment.canConfirm

  const goTo = (next: Step) => {
    setFailure(null)
    if (next === 'use') setEntered(initialEntered(cost, isDm))
    setStep(next)
  }

  /** Runs a card movement. Movements need the server: offline, it says so instead of trying. */
  const move = async (run: (by: string) => Promise<unknown>) => {
    if (uid === null) return
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setFailure(null)
    setIsBusy(true)
    try {
      await run(uid)
      onDone()
    } catch (error) {
      showError(error)
      setIsBusy(false)
    }
  }

  const toggleActive = () => {
    setFailure(null)
    actions.setActive(holding.id, !holding.active).catch(showError)
  }

  const isDialog = layout === 'dialog'
  const glow = faceGlow(cardFrame(card), {
    isActive: holding.active,
    isRevealed: true,
    isHeld: false,
  })
  const stageLight = STAGE_LIGHTS[glow ?? 'reveal-common']

  const useStep = (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane-raised p-3">
      <CharacterPicker choice={choice} onInput={() => setFailure(null)} />
      <UsePayment
        plan={payment}
        payer={payer}
        cost={cost}
        entered={entered}
        onEnteredChange={setEntered}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={isBusy || isTableBusy || !canConfirmUse}
          title={busyTitle}
          onClick={() => {
            const { amount } = payment
            if (amount === null) return
            void move((by) =>
              actions.closeHolding({
                holdingId: holding.id,
                by,
                reason: 'used',
                target: choice.target,
                addEffect: choice.addEffect,
                amount,
              }),
            )
          }}
        >
          {isBusy ? 'Kaydediliyor…' : confirmUseLabel(payment.amount)}
        </Button>
        <Button disabled={isBusy} onClick={() => goTo('idle')}>
          Vazgeç
        </Button>
      </div>
    </div>
  )

  const discardStep = (
    <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane-raised p-3">
      <p className="text-sm text-ink">
        {isCustom
          ? 'Bu Custom Card yok edilsin mi? Kart oyundan çıkar ve geri gelmez.'
          : 'Bu kart kullanılmadan elden atılsın mı?'}
        {!isCustom && !card.isRepeatable && !isExtraCopy && hasChannel(card)
          ? ' Kart havuza döner.'
          : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          disabled={isBusy || isTableBusy}
          title={busyTitle}
          onClick={() =>
            void move((by) =>
              actions.closeHolding({ holdingId: holding.id, by, reason: 'discarded' }),
            )
          }
        >
          {isBusy ? 'Kaydediliyor…' : isCustom ? 'Evet, yok et' : 'Evet, at'}
        </Button>
        <Button disabled={isBusy} onClick={() => goTo('idle')}>
          Vazgeç
        </Button>
      </div>
    </div>
  )

  const transferStep = (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane-raised p-3">
      <label htmlFor={`${ids}-receiver`} className="text-sm font-medium text-ink">
        Kime verilsin?
      </label>
      <select
        id={`${ids}-receiver`}
        value={receiver}
        onChange={(event) => setReceiver(event.target.value)}
        className={fieldClasses}
      >
        <option value="">Oyuncu seç</option>
        {receivers.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profileName(profile)}
          </option>
        ))}
      </select>
      <p className="text-sm text-ink-muted">
        Kart, seçilen oyuncunun elinin sonuna eklenir. Not, cost ve aktiflik korunur.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={isBusy || isTableBusy || receiver === ''}
          title={busyTitle}
          onClick={() =>
            void move((by) =>
              actions.transferHolding({ holdingId: holding.id, toUid: receiver, by }),
            )
          }
        >
          {isBusy ? 'Kaydediliyor…' : 'Onayla ve ver'}
        </Button>
        <Button disabled={isBusy} onClick={() => goTo('idle')}>
          Vazgeç
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {isDialog ? <DetailsBadges badges={holdingBadges(entry)} /> : null}
      <div className={cn('flex flex-col gap-4', isDialog && 'sm:flex-row sm:items-start')}>
        {/* The face over a soft light in the color it glows. Its marks are the badges above, not repeated under it. */}
        <div
          data-details-face=""
          className={cn(
            'relative mx-auto w-full shrink-0',
            isDialog ? 'max-w-72 sm:mx-0 sm:w-60' : 'max-w-66',
          )}
        >
          {stageLight ? (
            <div
              aria-hidden="true"
              data-stage-light=""
              className={cn(
                'pointer-events-none absolute -inset-4 rounded-full bg-radial to-transparent to-70%',
                stageLight,
              )}
            />
          ) : null}
          <div className="relative">
            <CardFace
              card={card}
              handCost={cost}
              isActive={holding.active}
              hasNote={holding.note !== ''}
              isExtraCopy={isExtraCopy}
              isRevealed
              showsMarks={false}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col items-start gap-2">
            <ul aria-label="Kart bilgileri" className="flex flex-wrap gap-1.5">
              {holdingInfo(card, cost, setName).map((info) => (
                <li key={info.label} className="max-w-full">
                  <Pill tone={info.tone} isMuted={info.isMuted}>
                    {info.label}
                  </Pill>
                </li>
              ))}
            </ul>
            {card.kind === 'custom' ? <CustomCardEffects card={card} /> : null}
            <Link
              to={cardHistoryPath(card)}
              className="text-[13px] font-medium text-gold hover:underline"
            >
              Kart geçmişi →
            </Link>
          </div>

          <p className="flex items-center gap-2 text-[13px] text-ink-muted">
            <PersonIcon />
            {genitive(holderName)} elinde
          </p>

          <NotePaper
            label="Kart notu"
            value={canUse ? note.value : holding.note}
            isEditable={canUse}
            maxLength={HOLDING_LIMITS.note}
            placeholder="Bu kart için oyuncuya özel not"
            onFocus={note.onFocus}
            onChange={note.onChange}
            onBlur={note.onBlur}
          />

          {canUse && step === 'idle' ? (
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={isTableBusy}
                title={busyTitle}
                onClick={() => goTo('use')}
                className="h-11 min-w-0 flex-1 text-[15px] font-semibold"
              >
                <BoltIcon />
                Kullan
              </Button>
              {isCustom ? null : (
                <Button
                  variant="danger"
                  disabled={isTableBusy}
                  title={busyTitle}
                  onClick={() => goTo('discard')}
                  className="h-11 w-20 shrink-0"
                >
                  <BinIcon className="size-4.5" />
                  At
                </Button>
              )}
            </div>
          ) : null}
          {/* A Custom Card leaves the game when discarded: its own button says so (spec: custom-cards, "Discarding a
              Custom Card"). */}
          {isCustom && canUse && step === 'idle' ? (
            <Button
              variant="danger"
              disabled={isTableBusy}
              title={busyTitle}
              onClick={() => goTo('discard')}
            >
              ✕ Custom kartı yok et
            </Button>
          ) : null}
          {step === 'use' ? useStep : null}
          {step === 'discard' ? discardStep : null}

          {isDm ? (
            <ToolSection title="DM araçları">
              <div className="flex items-center gap-2.5">
                <label htmlFor={`${ids}-cost`} className="flex-1 text-[13px] font-medium text-ink">
                  Bu eldeki cost
                </label>
                <input
                  id={`${ids}-cost`}
                  value={costOverride.value}
                  maxLength={HOLDING_LIMITS.costOverride}
                  placeholder={card.cost ?? NO_VALUE}
                  aria-describedby={`${ids}-base-cost`}
                  onFocus={costOverride.onFocus}
                  onChange={(event) => costOverride.onChange(event.target.value)}
                  onBlur={costOverride.onBlur}
                  className="h-9 w-14 rounded-lg border border-control-line bg-control px-1 text-center text-[15px] font-semibold text-ink placeholder:text-ink-muted"
                />
                <span id={`${ids}-base-cost`} className="text-xs text-ink-muted">
                  temel: {card.cost ?? NO_VALUE}
                </span>
              </div>
              {step === 'idle' ? (
                <div
                  className={cn('grid gap-2', card.hasHeldEffect ? 'grid-cols-2' : 'grid-cols-1')}
                >
                  {/* Only a card with a held effect has the switch (spec: card-holdings, "Active cards"). */}
                  {card.hasHeldEffect ? (
                    <Button
                      onClick={toggleActive}
                      className={cn(TOOL_BUTTON_CLASSES, holding.active && 'border-green/55')}
                    >
                      <PowerIcon className={cn('size-4.5', holding.active && 'text-green')} />
                      {holding.active ? 'Aktifliği kaldır' : 'Aktif et'}
                    </Button>
                  ) : null}
                  <Button
                    disabled={isTableBusy}
                    title={busyTitle}
                    onClick={() => goTo('transfer')}
                    className={TOOL_BUTTON_CLASSES}
                  >
                    <ArrowIcon className="size-4.5" />
                    Başkasına ver
                  </Button>
                </div>
              ) : null}
              {card.kind === 'custom' && step === 'idle' ? (
                <Button onClick={() => setIsEditingEffects(true)}>Efektleri düzenle</Button>
              ) : null}
              {card.kind === 'custom' && isEditingEffects ? (
                <CustomEffectsDialog card={card} onClose={() => setIsEditingEffects(false)} />
              ) : null}
              {step === 'transfer' ? transferStep : null}
            </ToolSection>
          ) : null}

          {canUse && step === 'idle' ? <TableBusyNote /> : null}

          {failure ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
            >
              {holdingFailureMessage(failure, { holderName })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

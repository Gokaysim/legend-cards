import { type AnimationEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useArt } from '@/features/art/artContext'
import { useBlessedShock } from '@/features/art/useBlessedShock'
import { usePicture } from '@/features/art/usePicture'
import { useAuth } from '@/features/auth/authContext'
import { formatAmount } from '@/features/balances/format'
import { useCardsById } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { FaceDownCard } from '@/features/draws/FaceDownCard'
import { isCursedPackType, type PackOpening } from '@/features/draws/schema'
import { DrawSpread } from '@/features/draws/table/DrawSpread'
import { DrawTable } from '@/features/draws/table/DrawTable'
import { LiveBanner } from '@/features/draws/table/LiveBanner'
import { TableChip, TableChips } from '@/features/draws/table/TableChip'
import { CSS_BACK_SHAPE, CSS_BACK_TONES } from '@/features/art/cssBack'
import { CssBackGlyph } from '@/features/art/NeutralCardBack'
import { useSetIndex } from '@/features/sets/setsContext'
import { DmOnly } from '@/features/users/DmOnly'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { dative, genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useReducedMotion } from '@/lib/useReducedMotion'

import { burstArtUrl, packCardBack, packOpeningTitle } from './catalog'
import { type PackFailure, packFailureMessage, toPackFailure } from './errors'
import { useOpenPack, usePackActions } from './packsContext'

/**
 * How long the burst runs: `--animate-pack-burst` in `theme.css`, plus a margin. The cards appear when the animation
 * ends, or after this at the latest, in case the browser never reports its end (a hidden tab).
 */
const BURST_FALLBACK_MS = 3100

/** Which pack this device shows, and whether it is expanded or shrunk to the banner. */
type ViewState = { packId: string; isExpanded: boolean }

/**
 * The open pack, on every screen and every device, live (mounted once in the app shell). A new pack opens expanded
 * on every device. Anyone can shrink it to a banner and bring it back. The hand's owner and the DM turn its cards
 * and choose; the DM can cancel it. When it ends, an expanded view shows how it ended until it is closed.
 */
export function OpenPackView() {
  const pack = useOpenPack()
  const [view, setView] = useState<ViewState | null>(null)
  const profiles = useProfiles()
  const { setName } = useSetIndex()
  const cardsById = useCardsById()

  if (pack !== null && pack.status === 'open' && view?.packId !== pack.id) {
    // A pack this device has not seen yet: show it. Adjusting state during render re-renders at once.
    setView({ packId: pack.id, isExpanded: true })
    return null
  }
  if (pack === null || view === null || view.packId !== pack.id) return null

  const nameOf = (uid: string) => {
    const profile =
      profiles.status === 'ready' ? profiles.data.find((p) => p.id === uid) : undefined
    return profile ? profileName(profile) : 'Bir oyuncu'
  }
  const setExpanded = (isExpanded: boolean) => setView({ packId: pack.id, isExpanded })

  if (!view.isExpanded) {
    const byCard = cardsById.status === 'ready' ? cardsById.data : null
    return pack.status === 'open' ? (
      <LiveBanner
        text={`${nameOf(pack.uid)} Pack açıyor · ${packOpeningTitle(pack, setName)}`}
        cards={pack.offered.map((cardId, index) => {
          const card = byCard?.get(cardId)
          return {
            key: cardId,
            card,
            isUp: pack.revealed.includes(index),
            back: packCardBack(pack, card),
          }
        })}
        onShow={() => setExpanded(true)}
      />
    ) : null
  }
  return (
    <PackDialog
      // A fresh dialog for each pack: no selection or step carries over.
      key={pack.id}
      pack={pack}
      nameOf={nameOf}
      onShrink={() => setExpanded(false)}
    />
  )
}

/** "−2 LP", "−7.500 GP", or "Ücretsiz", as the draw's payment chip. */
function paymentText(pack: PackOpening): string {
  if (pack.paidWith === 'none') return 'Ücretsiz'
  return `−${formatAmount(pack.cost)} ${pack.paidWith === 'lp' ? 'LP' : 'GP'}`
}

/** What a cancel gives back, for the DM's confirmation. */
function refundText(pack: PackOpening, ownerName: string): string {
  if (pack.paidWith === 'none') return 'Pack ücretsizdi; iade yok.'
  if (pack.paidWith === 'gp') return `Grup kesesine ${formatAmount(pack.cost)} GP iade edilecek.`
  return `${dative(ownerName)} ${formatAmount(pack.cost)} LP iade edilecek.`
}

type Step = 'idle' | 'cancel'

function PackDialog({
  pack,
  nameOf,
  onShrink,
}: {
  pack: PackOpening
  nameOf: (uid: string) => string
  onShrink: () => void
}) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const { setName } = useSetIndex()
  const cardsById = useCardsById()
  const actions = usePackActions()
  const isOnline = useOnlineStatus()
  const reducedMotion = useReducedMotion()

  // The burst plays only for a device that first sees the pack before any card is turned.
  const [isBursting, setIsBursting] = useState(
    () => pack.status === 'open' && pack.revealed.length === 0 && !reducedMotion,
  )
  useEffect(() => {
    if (!isBursting) return
    const timer = setTimeout(() => setIsBursting(false), BURST_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [isBursting])
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<PackFailure | null>(null)

  const ownerName = nameOf(pack.uid)
  const isOpen = pack.status === 'open'
  const canAct = isOpen && uid !== null && (uid === pack.uid || isDm)
  const isCursedType = isCursedPackType(pack.packType)
  const burstPicture = usePicture(burstArtUrl(useArt(), pack))
  // Only the pack's own animation ends the burst: the halo's and the backdrop's end on their own elements.
  const endBurst = (event: AnimationEvent) => {
    if (event.target === event.currentTarget) setIsBursting(false)
  }
  const allTurned = new Set(pack.revealed).size === pack.offered.length
  const cards = cardsById.status === 'ready' ? cardsById.data : null
  const cardOf = (cardId: string): Card | undefined => cards?.get(cardId)
  const selectedCard = selected === null ? undefined : cardOf(selected)

  // The shocked pair for a Blessed card turned while this view is open, here or on another device. A card already
  // face up when the view opened does not start it.
  const { shock, overlay } = useBlessedShock()
  const seenRevealed = useRef(pack.revealed)
  useEffect(() => {
    const seen = new Set(seenRevealed.current)
    seenRevealed.current = pack.revealed
    const turnedBlessed = pack.revealed.some((position) => {
      const cardId = pack.offered[position]
      return !seen.has(position) && cardId !== undefined && cards?.get(cardId)?.kind === 'blessed'
    })
    if (turnedBlessed) shock()
  }, [pack.revealed, pack.offered, cards, shock])

  const run = async (work: () => Promise<unknown>) => {
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await work()
    } catch (error) {
      setFailure(toPackFailure(error))
    } finally {
      setIsBusy(false)
    }
  }

  const turn = (position: number) => {
    setNotice(null)
    actions.turnPackCard(pack.id, position).catch((error: unknown) => {
      setFailure(toPackFailure(error))
    })
  }

  const select = (cardId: string) => {
    if (!allTurned) {
      setNotice('Önce bütün kartları çevir.')
      return
    }
    setNotice(null)
    setSelected(cardId)
  }

  const choose = () => {
    if (selected === null || uid === null) return
    void run(() => actions.choosePackCard({ drawId: pack.id, cardId: selected, by: uid }))
  }

  const cancel = () => {
    if (uid === null) return
    void run(() => actions.cancelPack({ drawId: pack.id, by: uid }))
  }

  const opener = pack.by === pack.uid ? null : nameOf(pack.by)
  const title = `${ownerName} Pack ${isOpen ? 'açıyor' : 'açtı'}`

  return (
    <Dialog
      title={title}
      onClose={onShrink}
      closeLabel={isOpen ? 'Küçült' : '✕ Kapat'}
      className="sm:max-w-5xl"
    >
      <TableChips label="Pack">
        {isOpen ? <TableChip variant="live">Canlı</TableChip> : null}
        <TableChip variant={isCursedType ? 'cursed' : 'plain'}>
          {packOpeningTitle(pack, setName)}
        </TableChip>
        <TableChip>{`${genitive(ownerName)} eline`}</TableChip>
        {opener === null ? null : <TableChip>{`Açan: ${opener}`}</TableChip>}
        <TableChip>{paymentText(pack)}</TableChip>
        {isOpen ? <TableChip variant="waiting">Masa bekliyor</TableChip> : null}
      </TableChips>

      <PackResult pack={pack} nameOf={nameOf} ownerName={ownerName} />

      {isBursting ? (
        <>
          {/* Keeps the dialog's size while the cards are not shown yet. */}
          <div className="min-h-64" />
          {/* Full screen, inside the dialog, so it lies above it in the top layer (design D8). */}
          <div
            data-testid="pack-burst"
            aria-hidden="true"
            className="fixed inset-0 z-50 grid animate-burst-backdrop place-items-center overflow-hidden motion-reduce:animate-none"
          >
            <div className="relative grid aspect-[563/788] w-[min(400px,76vw,45vh)] place-items-center drop-shadow-lift">
              <div
                data-burst-halo=""
                className="absolute inset-[3%] animate-burst-halo rounded-xl motion-reduce:animate-none"
              />
              {burstPicture.src === null ? (
                <div
                  data-burst-pack=""
                  onAnimationEnd={endBurst}
                  className={cn(
                    'relative flex size-full animate-pack-burst items-center justify-center rounded-xl border-2 bg-linear-to-br text-7xl motion-reduce:animate-none',
                    isCursedType
                      ? 'border-cursed from-control via-pane-raised to-cursed/40 text-cursed'
                      : 'border-gold from-control via-pane-raised to-primary text-gold',
                  )}
                >
                  {isCursedType ? '☠' : '✦'}
                </div>
              ) : (
                <img
                  data-burst-pack=""
                  src={burstPicture.src}
                  alt=""
                  draggable={false}
                  onError={burstPicture.onError}
                  onAnimationEnd={endBurst}
                  className="relative block size-full animate-pack-burst rounded-[10px] object-contain motion-reduce:animate-none"
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <DrawTable
          source={
            <PackSource
              src={burstPicture.src}
              onError={burstPicture.onError}
              isCursedType={isCursedType}
              count={pack.offered.length}
            />
          }
        >
          <h3 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
            {`Pack kartları · ${new Set(pack.revealed).size}/${pack.offered.length} açık`}
          </h3>
          <DrawSpread
            label="Pack kartları"
            size="pack"
            items={pack.offered}
            itemKey={(cardId) => cardId}
            renderItem={(cardId, index) => {
              const card = cardOf(cardId)
              const isTurned = pack.revealed.includes(index)
              const isMandatory = card?.kind === 'cursed'
              const isChosen =
                pack.chosen?.cardId === cardId || (pack.cursed?.cardId === cardId && isMandatory)
              const isPicked = selected === cardId || isChosen
              // Once every card is face up, a card that can be selected glows gold under the pointer, on the card or on
              // its "Seç" button (design D4).
              const canPick = isOpen && canAct && allTurned && !isMandatory
              return (
                <div className="group/pick flex flex-col gap-2">
                  {card ? (
                    <div
                      data-glow={isPicked ? 'selected' : undefined}
                      className={cn(
                        'rounded-xl transition-[filter] duration-200 motion-reduce:transition-none',
                        isPicked && 'drop-shadow-glow-selected',
                        canPick && 'group-hover/pick:drop-shadow-glow-selected',
                      )}
                    >
                      <FaceDownCard
                        card={card}
                        position={index + 1}
                        back={packCardBack(pack, card)}
                        isRevealed={isTurned}
                        onReveal={() => turn(index)}
                        canTurn={canAct}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-48 items-center justify-center rounded-xl border border-line bg-pane-raised p-3 text-sm text-ink-muted">
                      Kart yükleniyor…
                    </div>
                  )}
                  {isTurned && isMandatory ? (
                    <span className="self-center rounded-full border border-cursed px-2 py-0.5 text-xs font-medium text-cursed-soft">
                      Zorunlu
                    </span>
                  ) : null}
                  {isTurned && !isMandatory && canAct && card ? (
                    <Button
                      aria-pressed={selected === cardId}
                      aria-label={`${card.name}: seç`}
                      disabled={isBusy}
                      onClick={() => select(cardId)}
                    >
                      {selected === cardId ? '✓ Seçildi' : 'Seç'}
                    </Button>
                  ) : null}
                </div>
              )
            }}
          />
        </DrawTable>
      )}

      {isOpen && isCursedType ? (
        <p className="text-sm text-ink-muted">
          Cursed kart zorunludur: seçilen kartla birlikte ele eklenir.
        </p>
      ) : null}
      {isOpen && !canAct ? (
        <p className="text-sm text-ink-muted">{`${ownerName} seçim yapıyor…`}</p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-gold">
          {notice}
        </p>
      ) : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {packFailureMessage(failure, { owner: ownerName })}
        </p>
      ) : null}

      {canAct && step === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          {selectedCard ? (
            <Button variant="primary" disabled={isBusy} onClick={choose}>
              {isBusy ? 'Kaydediliyor…' : `Seç: ${selectedCard.name}`}
            </Button>
          ) : null}
          <DmOnly>
            <Button variant="danger" disabled={isBusy} onClick={() => setStep('cancel')}>
              İptal et ve iade et
            </Button>
          </DmOnly>
        </div>
      ) : null}

      {canAct && step === 'cancel' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane-raised p-3">
          <p className="text-sm text-ink">
            {`${refundText(pack, ownerName)} Hiçbir kart verilmez. Pack iptal edilsin mi?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={isBusy} onClick={cancel}>
              {isBusy ? 'Kaydediliyor…' : 'Evet, iptal et'}
            </Button>
            <Button disabled={isBusy} onClick={() => setStep('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}
      {overlay}
    </Dialog>
  )
}

/** How the pack ended, once it has: the chosen cards, or the cancel and its refund. */
function PackResult({
  pack,
  nameOf,
  ownerName,
}: {
  pack: PackOpening
  nameOf: (uid: string) => string
  ownerName: string
}) {
  if (pack.status === 'open') return null
  const closer = pack.closedBy === null ? 'DM' : nameOf(pack.closedBy)
  const text =
    pack.status === 'chosen'
      ? `${closer} seçti: ${pack.chosen?.cardName ?? ''}${
          pack.cursed ? ` · Cursed kart: ${pack.cursed.cardName}` : ''
        }. Kartlar ${genitive(ownerName)} eline eklendi.`
      : pack.paidWith === 'none'
        ? `${closer} iptal etti.`
        : `${closer} iptal etti; ${formatAmount(pack.cost)} ${pack.paidWith === 'lp' ? 'LP' : 'GP'} iade edildi.`
  return (
    <p role="status" className="rounded-lg border border-gold bg-pane-raised p-3 text-sm text-ink">
      {text}
    </p>
  )
}

/** The opened pack on the table, where a draw's deck stands: its picture with the number of its cards on it. */
function PackSource({
  src,
  onError,
  isCursedType,
  count,
}: {
  src: string | null
  onError: () => void
  isCursedType: boolean
  count: number
}) {
  const tone = isCursedType ? 'cursed' : 'neutral'
  return (
    <>
      <div data-testid="pack-source" className="relative mt-2 mr-2 self-stretch">
        {src === null ? (
          <div
            aria-hidden="true"
            className={cn(CSS_BACK_SHAPE, CSS_BACK_TONES[tone], 'drop-shadow-lift')}
          >
            <CssBackGlyph tone={tone} />
          </div>
        ) : (
          <img
            src={src}
            alt=""
            draggable={false}
            onError={onError}
            className="block aspect-[563/788] w-full rounded-xl object-contain opacity-70 drop-shadow-lift"
          />
        )}
        <span
          aria-hidden="true"
          className="absolute -top-3 -right-3 flex h-10 min-w-10 items-center justify-center rounded-full bg-gold px-2.5 text-base font-extrabold text-canvas tabular-nums shadow-[0_0_0_3px_var(--color-pane)]"
        >
          {count}
        </span>
      </div>
      <p className="text-xs text-ink-muted">{`Pack açıldı · ${count} kart`}</p>
    </>
  )
}

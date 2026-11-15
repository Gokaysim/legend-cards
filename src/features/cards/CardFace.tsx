import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'

import { ClockIcon } from '@/components/ui/icons'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { useSetIndex } from '@/features/sets/setsContext'
import { cn } from '@/lib/cn'

import { CardZoomDialog } from './CardZoomDialog'
import { CostBadge } from './CostBadge'
import {
  type CardFrame,
  cardFrame,
  costChange,
  type FaceGlow,
  faceGlow,
  NO_VALUE,
  rarityLabel,
  setLabel,
} from './display'
import type { Card } from './schema'
import { DM_ONLY_MARK } from './status'
import { visibleText } from './text'
import { useCardTilt } from './useCardTilt'

/** The kind's frame: drawn around a face without a picture, and around its "● Aktif" mark. */
const FRAME_CLASSES: Record<CardFrame, string> = {
  common: 'border-common',
  rare: 'border-gold',
  blessed: 'border-blessed',
  cursed: 'border-cursed',
}

/**
 * The glow around a face (design D4). The glow box is outside the box that tilts, so their filters never clash. A
 * revealed card's lift shadow is on the box around the face (`FaceDownCard`): a revealed Common card has only that.
 */
const GLOW_CLASSES: Record<FaceGlow, string> = {
  active: 'drop-shadow-glow-active',
  'active-cursed': 'drop-shadow-glow-cursed',
  'active-blessed': 'drop-shadow-glow-blessed',
  selected: 'drop-shadow-glow-selected',
  'reveal-common': '',
  'reveal-rare': 'drop-shadow-reveal-rare',
  'reveal-cursed': 'drop-shadow-reveal-cursed',
  'reveal-blessed': 'drop-shadow-reveal-blessed',
  held: 'drop-shadow-glow-held',
}

const GLOW_BOX_CLASSES = 'transition-[filter] duration-150 motion-reduce:transition-none'

/**
 * The magnifier and the note icon in the face's corners (design D3): shown while the pointer rests on the face or the
 * keyboard focus is inside it, and at all times on a device without hover.
 */
const CORNER_ICON_CLASSES =
  'absolute z-20 flex size-7 items-center justify-center rounded-full border border-line bg-canvas text-sm leading-none text-ink opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 no-hover:opacity-100 motion-reduce:transition-none'

/** Where the corner icons sit: on the picture's frame clear of its d20 and set symbol, or in the CSS face's corners. */
const MAGNIFIER_POSITION = { picture: 'top-[2%] right-[3%]', css: 'top-2 right-2' } as const
/** The DM's edit control, left of the magnifier. */
const EDIT_POSITION = {
  picture: 'top-[2%] right-[calc(3%+2.25rem)]',
  css: 'top-2 right-11',
} as const
/** The history control: left of the DM's edit control, or left of the magnifier where there is none. */
const HISTORY_POSITION = {
  withEdit: { picture: 'top-[2%] right-[calc(3%+4.5rem)]', css: 'top-2 right-20' },
  withoutEdit: EDIT_POSITION,
} as const
const NOTE_POSITION = { picture: 'bottom-[2%] left-[3%]', css: 'bottom-2 left-2' } as const

/**
 * Two mouse presses on one face at most this far apart, in ms, make the double click that zooms it (design D2 of
 * `polish-cards-packs-and-mascots`). The browser's own double-click interval is shorter on most systems.
 */
const DOUBLE_PRESS_MS = 600

/** The last two presses on a face, for its double click. */
type Presses = { last: number; previous: number; pointerType: string }

/** A small label on the face, for example "Aktif". */
function Mark({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

export type CardFaceProps = {
  card: Card
  /**
   * For a card in a hand: its cost there, the cost override or the card's own cost. When both costs are numbers
   * and differ, the cost is marked lower (green) or higher (red).
   */
  handCost?: string | null
  /** For a card in a hand: it is switched active. Marked in the frame's color. */
  isActive?: boolean
  /** For a card in a hand: it has a note. Shown as the note icon in the face's bottom-left corner. */
  hasNote?: boolean
  /** For a card in a hand: an extra copy given by the DM, not the copy that holds the card. */
  isExtraCopy?: boolean
  /**
   * For a card in a hand whose details show beside it: it is the selected card. It glows gold unless it is active, and
   * its open control is marked `aria-current` for screen readers.
   */
  isSelected?: boolean
  /** In the library: the names of the players holding it, for a held normal card or a Cursed card in hands. */
  heldBy?: readonly string[]
  /** In a draw or an open pack: the card has been turned face up. It glows in its kind's color. */
  isRevealed?: boolean
  /**
   * In the card views of the hand, the library and the Cursed Deck: the face tilts toward a mouse pointer, with a
   * soft light (design D5). Faces inside dialogs stay still.
   */
  isTiltable?: boolean
  /**
   * `false` leaves out the marks ("● Aktif", "Ek kopya"…) under the face, where its owner shows them elsewhere: the
   * card's details show them as badges at their top (design D3 of `redesign-selected-card-panel`).
   */
  showsMarks?: boolean
  /** `false` leaves out the magnifier and the double click, for the face inside the zoom view. */
  isZoomable?: boolean
  /**
   * `false` keeps a double click from zooming, where the face's first click opens a dialog on top of it: the hand on
   * a narrower window (spec: card-zoom, "Double click opens the zoom view"). The magnifier still zooms.
   */
  zoomsOnDoubleClick?: boolean
  /** In the DM's library: the definition status to show as a mark ("Taslak", "Yayında", "Kaldırıldı"). */
  statusMark?: string
  /** In the DM's library: marks "🔒 DM" a card whose "Listede görünür" is off (spec: card-library, "Cards not listed for players"). */
  isHiddenMarked?: boolean
  /** In the DM's library: opens the card's edit form from a "✎" control beside the magnifier. */
  onEdit?: () => void
  /**
   * In the Kart kütüphanesi and the Cursed Deck: the address of the card's Kart geçmişi, opened from a clock control
   * left of the edit control or the magnifier (spec: card-library, "History control on library faces").
   */
  historyPath?: string
  /**
   * Called when the face is selected anywhere outside its magnifier and set symbol, for example to open a hand
   * card's details. Without it, the face itself does nothing.
   */
  onOpen?: () => void
  /** The name of that whole-face control for screen readers, for example "Night Owl: ayrıntılar". */
  openLabel?: string
}

/**
 * One card shown as a card face. With the card's picture (design D6), the picture alone is the face: its printed
 * frame shows the kind (spec: visual-effects). The picture carries the cost, name and text, which stay in the DOM for
 * screen readers and search; a hand cost that differs from the card's own cost is a badge on the picture's cost
 * corner. Nothing is written under the picture: the set, rarity and mechanic pack show in a note while the pointer
 * rests on the picture's set symbol, or after a tap on it. Without a picture, or when it fails to load, the face draws
 * its kind's frame color, the cost, name and visible text, with the set, rarity and mechanic pack below. Cursed cards
 * have none of those three. A card in a hand shows its marks, and its note as an icon in the bottom-left corner; a
 * held card in the library shows who holds it.
 *
 * The face glows (design D4): an active card in a hand, the selected card of a hand, a revealed card in a draw or a
 * pack, and a held card in the library, each in its own color.
 *
 * In the library, a clock control left of the edit control or the magnifier opens the card's Kart geçmişi.
 *
 * The magnifier in the top-right corner opens the card's zoom view (spec: card-zoom), and so does a double click with a
 * mouse on the face outside its controls, when both presses landed on this face. The magnifier and the note icon show
 * on hover or keyboard focus, and at all times on a device without hover.
 */
export function CardFace({
  card,
  handCost,
  isActive = false,
  hasNote = false,
  isExtraCopy = false,
  isSelected = false,
  heldBy,
  isRevealed = false,
  isTiltable = false,
  showsMarks = true,
  isZoomable = true,
  zoomsOnDoubleClick = true,
  statusMark,
  isHiddenMarked = false,
  onEdit,
  historyPath,
  onOpen,
  openLabel,
}: CardFaceProps) {
  const picture = usePicture(useArt().pictureUrl(card.picture))
  const { setName } = useSetIndex()
  const infoId = useId()
  // A tap shows the set symbol's note until the symbol loses the focus; a pointer resting on it shows it too (CSS).
  const [isInfoShown, setIsInfoShown] = useState(false)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const magnifierRef = useRef<HTMLButtonElement>(null)
  const wasZoomOpen = useRef(false)
  const presses = useRef<Presses>({ last: -Infinity, previous: -Infinity, pointerType: '' })
  const frame = cardFrame(card)
  const isInHand = handCost !== undefined
  const cost = (isInHand ? handCost : card.cost) ?? NO_VALUE
  const change = isInHand ? costChange(card.cost, handCost) : null
  const text = visibleText(card.text)
  const hasMarks =
    showsMarks &&
    (isActive || isExtraCopy || heldBy !== undefined || statusMark !== undefined || isHiddenMarked)
  const look = picture.src !== null ? 'picture' : 'css'
  const glow = faceGlow(frame, {
    isActive,
    isSelected,
    isRevealed,
    isHeld: heldBy !== undefined && heldBy.length > 0,
  })
  const glowClasses = cn(GLOW_BOX_CLASSES, glow && GLOW_CLASSES[glow])
  const { ref: tiltRef, handlers: tiltHandlers } = useCardTilt(isTiltable)

  // The browser gives the focus back after Escape, but not when the zoom view is unmounted by "✕ Kapat": the focus
  // returns to the magnifier either way (design D6).
  useEffect(() => {
    if (isZoomOpen) wasZoomOpen.current = true
    else if (wasZoomOpen.current) {
      wasZoomOpen.current = false
      magnifierRef.current?.focus()
    }
  }, [isZoomOpen])

  // Both presses of a double click must land on this face (design D2): a press that lands on a dialog or a turned card
  // that appeared under the pointer never counts. Events from the zoom view, React's child through a portal, are not
  // the face's own and are left out.
  const onFacePointerDown = (event: PointerEvent<HTMLElement>) => {
    tiltHandlers.onPointerDown?.(event)
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
    const press = presses.current
    press.previous = press.last
    press.last = event.timeStamp
    press.pointerType = event.pointerType
  }
  const onFaceClick = (event: MouseEvent<HTMLElement>) => {
    if (!isZoomable || !zoomsOnDoubleClick || event.detail !== 2) return
    const target = event.target
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return
    if (target.closest('[data-face-control]') !== null) return
    const press = presses.current
    if (press.pointerType === 'mouse' && press.last - press.previous <= DOUBLE_PRESS_MS) {
      setIsZoomOpen(true)
    }
  }

  const costBadge = (className: string) => (
    <CostBadge cost={cost} baseCost={card.cost} change={change} className={className} />
  )
  // Card names and texts are English: hyphenate them as English on narrow faces.
  const name = (className?: string) => (
    <h3
      lang="en"
      className={cn(
        'min-w-0 text-sm leading-snug font-semibold break-words hyphens-auto text-ink',
        className,
      )}
    >
      {card.name}
    </h3>
  )
  const body = (className?: string) => (
    <p
      lang="en"
      className={cn(
        'flex-1 text-sm leading-snug break-words hyphens-auto whitespace-pre-line text-ink',
        className,
      )}
    >
      {text || NO_VALUE}
    </p>
  )
  const marks = hasMarks ? (
    <div data-marks="" className="flex flex-wrap gap-1">
      {statusMark ? <Mark className="border-ink-muted">{statusMark}</Mark> : null}
      {isHiddenMarked ? <Mark className="border-ink-muted">{DM_ONLY_MARK}</Mark> : null}
      {isActive ? <Mark className={FRAME_CLASSES[frame]}>● Aktif</Mark> : null}
      {isExtraCopy ? <Mark>Ek kopya</Mark> : null}
      {heldBy ? <Mark className="border-gold">Elde: {heldBy.join(', ')}</Mark> : null}
    </div>
  ) : null
  const details =
    card.kind === 'cursed' ? null : (
      // The labels are for screen readers; on the face the values use the full width.
      <dl className="flex flex-col gap-0.5 text-xs text-ink-muted">
        <div className="flex flex-wrap gap-x-1">
          <dt className="sr-only">Set</dt>
          <dd className="after:ml-1 after:content-['·']">{setLabel(card, setName) ?? NO_VALUE}</dd>
          <dt className="sr-only">Rarity</dt>
          <dd>{rarityLabel(card) ?? NO_VALUE}</dd>
        </div>
        <div>
          <dt className="sr-only">Mechanic Pack</dt>
          <dd className="break-words">{card.mechanicPack ?? NO_VALUE}</dd>
        </div>
      </dl>
    )
  // First in the Tab order. On the CSS face it lies above the content (z-1) and below the set symbol (z-10) and the
  // corner icons (z-20). On a picture face, the picture's box lies above it (z-2) and lets the pointer through, except
  // on its controls: the glow and the tilt make that box a stacking context, which would otherwise sink the controls
  // below this button. A tint on hover suits only the CSS face's rectangle; a picture tilts instead.
  const openButton = onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      aria-current={isSelected || undefined}
      className={cn(
        'absolute -inset-0.5 z-1 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        look === 'css' && 'hover:bg-ink/5',
      )}
    />
  ) : null
  const magnifier = isZoomable ? (
    <button
      ref={magnifierRef}
      type="button"
      aria-label={`${card.name}: büyüt`}
      data-face-control=""
      onClick={() => setIsZoomOpen(true)}
      className={cn(
        CORNER_ICON_CLASSES,
        'pointer-events-auto cursor-zoom-in',
        MAGNIFIER_POSITION[look],
      )}
    >
      <span aria-hidden="true">🔍</span>
    </button>
  ) : null
  const editButton = onEdit ? (
    <button
      type="button"
      aria-label={`${card.name}: düzenle`}
      data-face-control=""
      onClick={onEdit}
      className={cn(CORNER_ICON_CLASSES, 'pointer-events-auto', EDIT_POSITION[look])}
    >
      <span aria-hidden="true">✎</span>
    </button>
  ) : null
  const historyLink =
    historyPath !== undefined ? (
      <Link
        to={historyPath}
        aria-label={`${card.name}: geçmiş`}
        data-face-control=""
        className={cn(
          CORNER_ICON_CLASSES,
          'pointer-events-auto',
          HISTORY_POSITION[onEdit ? 'withEdit' : 'withoutEdit'][look],
        )}
      >
        <ClockIcon className="size-3.5" />
      </Link>
    ) : null
  // The icon only shows; a click on it reaches the face below. Screen readers read "Not var" at all times.
  const note = hasNote ? (
    <>
      <span
        aria-hidden="true"
        data-note-icon=""
        className={cn(CORNER_ICON_CLASSES, 'pointer-events-none', NOTE_POSITION[look])}
      >
        ✎
      </span>
      <span className="sr-only">Not var</span>
    </>
  ) : null
  const zoom = isZoomOpen ? (
    <CardZoomDialog card={card} handCost={handCost} onClose={() => setIsZoomOpen(false)} />
  ) : null

  if (picture.src !== null) {
    // No frame of its own: the picture's printed frame shows the kind (design D3). The glow box holds the picture's
    // box, which tilts.
    return (
      <article
        aria-label={card.name}
        data-frame={frame}
        className="group relative flex h-full flex-col gap-2"
        {...tiltHandlers}
        onPointerDown={onFacePointerDown}
        onClick={onFaceClick}
      >
        {openButton}
        <div
          data-glow={glow ?? undefined}
          className={cn('relative z-2', onOpen && 'pointer-events-none', glowClasses)}
        >
          <div ref={tiltRef} className={cn('relative rounded-lg', isTiltable && 'card-tilt')}>
            <CardPicture src={picture.src} alt={card.name} onError={picture.onError} />
            {/* Over the picture's own cost (its top-left d20) only when the hand changes it. */}
            {change ? (
              costBadge(
                'absolute top-[7.4%] left-[10.7%] -translate-x-1/2 -translate-y-1/2 border-2 shadow-md',
              )
            ) : (
              <span className="sr-only">{costBadge('')}</span>
            )}
            {details ? (
              <>
                {/* Over the picture's set symbol, in its bottom-right corner. */}
                <button
                  type="button"
                  aria-label="Set, rarity ve mechanic pack"
                  aria-describedby={infoId}
                  data-face-control=""
                  onClick={() => setIsInfoShown((shown) => !shown)}
                  onBlur={() => setIsInfoShown(false)}
                  className="peer pointer-events-auto absolute right-[3%] bottom-[2%] z-10 h-[11%] w-[14%] cursor-help rounded-full focus-visible:outline-2 focus-visible:outline-gold"
                />
                {/* Transparent, not hidden, while it is not shown: screen readers and search keep it. It stays
                    inside the picture, so it never widens the page. */}
                <div
                  id={infoId}
                  data-shown={isInfoShown || undefined}
                  className={cn(
                    'pointer-events-none absolute right-[3%] bottom-[14%] z-30 max-w-[94%] rounded-lg border border-line bg-canvas px-2 py-1.5 opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100 motion-reduce:transition-none',
                    isInfoShown && 'opacity-100',
                  )}
                >
                  {details}
                </div>
              </>
            ) : null}
            {magnifier}
            {editButton}
            {historyLink}
            {note}
          </div>
        </div>
        {name('sr-only')}
        {body('sr-only')}
        {marks}
        {zoom}
      </article>
    )
  }

  // The glow box is always there, so switching a glow never remounts the face (and an open zoom view with it).
  return (
    <div data-glow={glow ?? undefined} className={cn('h-full', glowClasses)}>
      <article
        ref={tiltRef}
        aria-label={card.name}
        data-frame={frame}
        className={cn(
          'group relative flex h-full flex-col gap-2 rounded-xl border-2 bg-pane-raised p-3',
          // Room for the note icon, so it never covers the text or the details.
          hasNote && 'pb-10',
          FRAME_CLASSES[frame],
          isTiltable && 'card-tilt',
        )}
        {...tiltHandlers}
        onPointerDown={onFacePointerDown}
        onClick={onFaceClick}
      >
        {openButton}
        {/* The cost sits above the name, so the name gets the face's full width and long names do not break. The
            magnifier takes the right end of the cost's row. */}
        <header className="flex flex-col items-start gap-1.5">
          {costBadge('')}
          {name()}
        </header>
        {marks}
        {body()}
        {details}
        {magnifier}
        {editButton}
        {historyLink}
        {note}
        {zoom}
      </article>
    </div>
  )
}

import {
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
} from 'react'

import { cn } from '@/lib/cn'

import type { FacetChoice } from './filters'
import { pillClasses } from './pillClasses'

export type FilterPillProps = {
  /** The facet's name: "Set", "Rarity", "Cost"… */
  name: string
  choices: readonly FacetChoice[]
  /** The chosen value, or `null` for "Tümü". */
  value: string | null
  onChange: (value: string | null) => void
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** The menu's width from 640 px, and its tallest height. */
const MENU_WIDTH = 256
const MENU_MAX_HEIGHT = 288
const EDGE = 8

/**
 * Places an open menu under its pill. The menu is fixed to the viewport, so the dialog's scrolling box never clips
 * it. Under 640 px it spans the filter bar; from 640 px it starts at the pill, kept inside the window.
 */
function placeMenu(menu: HTMLElement, trigger: HTMLElement) {
  const pill = trigger.getBoundingClientRect()
  const bar = trigger.closest('[role="group"]')?.getBoundingClientRect() ?? pill
  const isNarrow = window.innerWidth < 640
  const width = isNarrow ? bar.width : Math.min(MENU_WIDTH, window.innerWidth - 2 * EDGE)
  const left = isNarrow
    ? bar.left
    : Math.max(EDGE, Math.min(pill.left, window.innerWidth - width - EDGE))
  const top = pill.bottom + 4
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  menu.style.width = `${width}px`
  menu.style.maxHeight = `${Math.max(160, Math.min(MENU_MAX_HEIGHT, window.innerHeight - top - EDGE))}px`
}

/**
 * One filter as a pill (design D3 of `improve-draw-and-give-dialogs`): it shows the facet's name, or "Name: value"
 * while a value is chosen, and opens a menu of its choices with their counts. A chosen pill also has "×", which
 * clears just that filter. Escape closes the menu without closing the dialog around it, and gives the focus back to
 * the pill; a press outside closes it too. Under 640 px the menu spans the filter bar (`placeMenu`).
 */
export function FilterPill({
  name,
  choices,
  value,
  onChange,
  isOpen,
  onOpenChange,
}: FilterPillProps) {
  const menuId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const chosen = value === null ? undefined : choices.find((choice) => choice.value === value)
  const shownValue = value === null ? null : (chosen?.label ?? value)

  const close = (focusPill: boolean) => {
    onOpenChange(false)
    if (focusPill) trigger.current?.focus()
  }

  const dismiss = useEffectEvent((focusPill: boolean) => close(focusPill))

  // While open, the menu follows its pill when the dialog scrolls or the window changes size.
  useLayoutEffect(() => {
    if (!isOpen) return
    const place = () => {
      if (menu.current && trigger.current) placeMenu(menu.current, trigger.current)
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [isOpen])

  // While open: the checked item gets the focus; Escape (the dialog's `cancel`) and a press outside close the menu.
  useEffect(() => {
    if (!isOpen) return
    const items = menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
    const checked = menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    ;(checked ?? items?.[0])?.focus()

    const dialog = wrapper.current?.closest('dialog')
    const onCancel = (event: Event) => {
      event.preventDefault()
      dismiss(true)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) dismiss(false)
    }
    dialog?.addEventListener('cancel', onCancel)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      dialog?.removeEventListener('cancel', onCancel)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen])

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(items.length - 1)
        break
      case 'Escape':
        // Keeps the dialog around open: Escape belongs to the menu while it is open.
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

  const choose = (next: string | null) => {
    onChange(next)
    close(true)
  }

  return (
    <div ref={wrapper} className="flex items-center">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={cn(pillClasses(value !== null), value !== null && 'rounded-r-none pr-2.5')}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="truncate">
          {shownValue === null ? (
            name
          ) : (
            <>
              {name}: <span className="font-semibold">{shownValue}</span>
            </>
          )}
        </span>
        <span aria-hidden="true" className="text-xs text-ink-muted">
          {isOpen ? '▴' : '▾'}
        </span>
      </button>
      {value !== null ? (
        <button
          type="button"
          aria-label={`${name} filtresini kaldır`}
          className="inline-flex h-9 items-center rounded-r-full border border-l-0 border-gold bg-gold/15 pr-3 pl-2 text-sm text-ink hover:bg-gold/25"
          onClick={() => onChange(null)}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
      {isOpen ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={name}
          onKeyDown={onMenuKeyDown}
          className="fixed z-50 flex flex-col overflow-y-auto rounded-xl border border-control-line bg-pane-raised p-1.5 shadow-lg"
        >
          <MenuItem label="Tümü" isChecked={value === null} onSelect={() => choose(null)} />
          {choices.map((choice) => (
            <MenuItem
              key={choice.value}
              label={choice.label}
              count={choice.count}
              isChecked={choice.value === value}
              onSelect={() => choose(choice.value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  label,
  count,
  isChecked,
  onSelect,
}: {
  label: string
  count?: number
  isChecked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isChecked}
      aria-label={count === undefined ? label : `${label}, ${count} kart`}
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        'flex min-h-9 shrink-0 items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm hover:bg-control focus-visible:bg-control',
        isChecked ? 'font-semibold text-gold' : count === 0 ? 'text-ink-muted' : 'text-ink',
      )}
    >
      <span className="min-w-0 break-words">{label}</span>
      {count === undefined ? null : (
        <span className="shrink-0 text-xs text-ink-muted tabular-nums">{count}</span>
      )}
    </button>
  )
}

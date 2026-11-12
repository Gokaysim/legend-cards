import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './Button'

export type DialogProps = {
  title: string
  /**
   * Called when the user closes the dialog: the "Kapat" button, Escape, or with `closeOnBackdrop`, a click outside it.
   * The caller unmounts it.
   */
  onClose: () => void
  children: ReactNode
  className?: string
  /** The close button's text. Defaults to "✕ Kapat". */
  closeLabel?: string
  /** `true` also closes it with a click or tap outside it, on the backdrop. */
  closeOnBackdrop?: boolean
  /**
   * `true` draws only the content: no header, no padding and no surface of its own. The title names the dialog for
   * screen readers alone, and the content brings its own close control (design D3 of
   * `polish-cards-packs-and-mascots`).
   */
  bare?: boolean
}

/**
 * A pointer on the dialog's backdrop: the backdrop belongs to the `<dialog>` itself, outside its box. Its content
 * fills the box, so a target that is the `<dialog>` inside its box can only be its own scrollbar.
 */
function isOnBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false
  const box = event.currentTarget.getBoundingClientRect()
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
}

/**
 * A modal dialog on the native `<dialog>`, the same on every width. It opens as a modal when it mounts: render it
 * only while it should be open. The browser keeps the focus inside it, closes it with Escape, and puts the rest of
 * the page behind it. Removing it from the page closes it. Mark the field that should get the focus first with
 * `data-autofocus`; otherwise the close button gets it. A dialog may open inside another one: closing the inner
 * one leaves the outer one open. With `closeOnBackdrop`, a press that starts and ends outside the dialog closes it, so
 * dragging out of it, for example while selecting text, does not.
 */
export function Dialog({
  title,
  onClose,
  children,
  className,
  closeLabel = '✕ Kapat',
  closeOnBackdrop = false,
  bare = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    // Outside the document there is nothing to show, and the browser throws. That happens when a page takes the
    // app's root out of the document while the app keeps running: a pack that opens meanwhile would crash it.
    if (!dialog || dialog.open || !dialog.isConnected) return
    dialog.showModal()
    // The browser focuses the first focusable element (the close button); a field marked `data-autofocus` wins.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={bare ? undefined : titleId}
      aria-label={bare ? title : undefined}
      // React hands a nested dialog's `close` event up to every dialog around it; only this dialog's own closes it.
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onPointerDown={
        closeOnBackdrop
          ? (event) => {
              pressedOnBackdrop.current = isOnBackdrop(event)
            }
          : undefined
      }
      onClick={
        closeOnBackdrop
          ? (event) => {
              if (pressedOnBackdrop.current && isOnBackdrop(event)) onClose()
              pressedOnBackdrop.current = false
            }
          : undefined
      }
      className={cn(
        bare
          ? 'm-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-visible border-0 bg-transparent p-0 text-ink backdrop:bg-canvas/80'
          : 'm-auto max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-pane p-0 text-ink backdrop:bg-canvas/80 sm:max-w-xl',
        className,
      )}
    >
      {bare ? (
        children
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <header className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="min-w-0 text-lg font-semibold break-words text-ink">
              {title}
            </h2>
            <Button variant="ghost" onClick={onClose} className="shrink-0">
              {closeLabel}
            </Button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

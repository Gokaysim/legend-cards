import { type ReactNode, useEffect, useId, useRef } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './Button'

export type DialogProps = {
  title: string
  /** Called when the user closes the dialog: the "Kapat" button or Escape. The caller unmounts it. */
  onClose: () => void
  children: ReactNode
  className?: string
  /** The close button's text. Defaults to "✕ Kapat". */
  closeLabel?: string
}

/**
 * A modal dialog on the native `<dialog>`, the same on every width. It opens as a modal when it mounts: render it
 * only while it should be open. The browser keeps the focus inside it, closes it with Escape, and puts the rest of
 * the page behind it. Removing it from the page closes it. Mark the field that should get the focus first with
 * `data-autofocus`; otherwise the close button gets it.
 */
export function Dialog({
  title,
  onClose,
  children,
  className,
  closeLabel = '✕ Kapat',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-pane p-0 text-ink backdrop:bg-canvas/80 sm:max-w-xl',
        className,
      )}
    >
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
    </dialog>
  )
}

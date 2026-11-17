import { useEffect, useId, useState } from 'react'

/** A popover's open state, shared by its trigger (`PopoverTrigger`) and the popover itself. */
export type Popover = {
  /** Names the trigger in the DOM (`data-popover-trigger`): a press on it does not count as a press outside. */
  id: string
  isOpen: boolean
  setIsOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void
}

/**
 * The open state of a popover that `PopoverTrigger` opens (design D4 of redesign-hand-dashboard). While it is open,
 * Escape and a press outside its trigger close it.
 */
export function usePopover(): Popover {
  const id = useId()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      const trigger =
        event.target instanceof Element ? event.target.closest('[data-popover-trigger]') : null
      if (trigger?.getAttribute('data-popover-trigger') !== id) setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [id, isOpen])

  return { id, isOpen, setIsOpen }
}

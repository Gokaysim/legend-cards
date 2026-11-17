import { type ComponentPropsWithoutRef, useRef } from 'react'

import type { Popover } from '@/lib/usePopover'

/**
 * What a tap or a key press on the trigger does: `toggle` opens and closes the popover (a stat that opens a list),
 * `ignore` leaves it alone, because the click already does something else (a tab that also opens its own content).
 */
export type PopoverTap = 'toggle' | 'ignore'

const isPointing = (pointerType: string) => pointerType === 'mouse' || pointerType === 'pen'

export type PopoverTriggerProps = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'popover'> & {
  /** The popover's state, from `usePopover`. */
  state: Popover
  tap: PopoverTap
}

/**
 * A button that opens a popover (design D4 of redesign-hand-dashboard; design D6 of the hand summary): while a mouse or
 * pen rests on it, while it has the focus from the keyboard, and, with `tap: 'toggle'`, after a tap until the next tap.
 * A touch resting on it never opens the popover. Leaving it or blurring it closes the popover; `usePopover` closes it
 * with Escape and a press outside. Its own `onClick`, `onFocus` and `onBlur` still run.
 */
export function PopoverTrigger({
  state,
  tap,
  onClick,
  onFocus,
  onBlur,
  ...props
}: PopoverTriggerProps) {
  /** The pointer type of the last press, and whether a press is under way until its click or the blur. */
  const lastPointer = useRef('')
  const isPressed = useRef(false)
  const { setIsOpen } = state
  return (
    <button
      type="button"
      data-popover-trigger={state.id}
      {...props}
      onPointerEnter={(event) => {
        if (isPointing(event.pointerType)) setIsOpen(true)
        props.onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        if (isPointing(event.pointerType)) setIsOpen(false)
        props.onPointerLeave?.(event)
      }}
      onPointerDown={(event) => {
        lastPointer.current = event.pointerType
        isPressed.current = true
        props.onPointerDown?.(event)
      }}
      onClick={(event) => {
        isPressed.current = false
        // `detail` is 0 for a click from the keyboard.
        if (event.detail !== 0 && isPointing(lastPointer.current)) setIsOpen(true)
        else if (tap === 'toggle') setIsOpen((current) => !current)
        onClick?.(event)
      }}
      onFocus={(event) => {
        // Focus from a press is left to the click; a tap may focus the button before its click.
        if (!isPressed.current) setIsOpen(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        isPressed.current = false
        setIsOpen(false)
        onBlur?.(event)
      }}
    />
  )
}

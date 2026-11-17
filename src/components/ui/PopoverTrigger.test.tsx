import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePopover } from '@/lib/usePopover'

import { type PopoverTap, PopoverTrigger } from './PopoverTrigger'

function Trigger({ tap }: { tap: PopoverTap }) {
  const popover = usePopover()
  return (
    <>
      <PopoverTrigger state={popover} tap={tap}>
        Trigger
      </PopoverTrigger>
      {popover.isOpen ? <p>Open</p> : null}
      <p>Elsewhere</p>
    </>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Trigger' })
const isOpen = () => screen.queryByText('Open') !== null

describe('PopoverTrigger', () => {
  it.each<PopoverTap>(['toggle', 'ignore'])(
    'opens while a mouse rests on the trigger, and closes when it leaves (%s)',
    (tap) => {
      render(<Trigger tap={tap} />)

      fireEvent.pointerEnter(trigger(), { pointerType: 'mouse' })
      expect(isOpen()).toBe(true)
      fireEvent.pointerLeave(trigger(), { pointerType: 'mouse' })
      expect(isOpen()).toBe(false)
    },
  )

  it.each<PopoverTap>(['toggle', 'ignore'])(
    'opens with the keyboard focus, and closes with Escape or the blur (%s)',
    (tap) => {
      render(<Trigger tap={tap} />)

      act(() => trigger().focus())
      expect(isOpen()).toBe(true)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(isOpen()).toBe(false)

      act(() => trigger().blur())
      act(() => trigger().focus())
      expect(isOpen()).toBe(true)
      act(() => trigger().blur())
      expect(isOpen()).toBe(false)
    },
  )

  it('keeps a mouse-opened popover open after a click', () => {
    render(<Trigger tap="ignore" />)

    fireEvent.pointerEnter(trigger(), { pointerType: 'mouse' })
    fireEvent.pointerDown(trigger(), { pointerType: 'mouse' })
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(true)
  })

  it('closes with a press outside the trigger', () => {
    render(<Trigger tap="toggle" />)

    act(() => trigger().focus())
    fireEvent.pointerDown(screen.getByText('Elsewhere'), { pointerType: 'touch' })
    expect(isOpen()).toBe(false)
  })

  it('toggles with taps, and ignores a touch resting on the trigger, with tap "toggle"', () => {
    render(<Trigger tap="toggle" />)

    fireEvent.pointerEnter(trigger(), { pointerType: 'touch' })
    expect(isOpen()).toBe(false)
    // A tap may focus the trigger before its click: the click alone decides.
    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    act(() => trigger().focus())
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(true)
    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(false)
  })

  it('never opens from a tap with tap "ignore"', () => {
    render(<Trigger tap="ignore" />)

    fireEvent.pointerEnter(trigger(), { pointerType: 'touch' })
    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    act(() => trigger().focus())
    fireEvent.click(trigger(), { detail: 1 })
    expect(isOpen()).toBe(false)
  })

  it('toggles with a key press with tap "toggle", and leaves it alone with tap "ignore"', () => {
    const { unmount } = render(<Trigger tap="toggle" />)
    act(() => trigger().focus())
    fireEvent.click(trigger(), { detail: 0 })
    expect(isOpen()).toBe(false)
    unmount()

    render(<Trigger tap="ignore" />)
    act(() => trigger().focus())
    fireEvent.click(trigger(), { detail: 0 })
    expect(isOpen()).toBe(true)
  })
})

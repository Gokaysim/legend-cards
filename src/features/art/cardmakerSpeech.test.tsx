import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type SpeechLine, useSpeechTrigger, useSpokenLine } from './cardmakerSpeech'
import { CardmakerSpeechProvider } from './CardmakerSpeechProvider'

const BLOOD: SpeechLine = {
  title: 'Blood & Battle Mechanic Pack',
  summary: 'Combat etkileri.',
  speech: 'Aman dikkat et kendine evladım.',
}
const HORN: SpeechLine = {
  title: 'Horn of Plenty Mechanic Pack',
  summary: 'Kart çektiren kartlar içerir.',
  speech: 'Evet! Kart!',
}

function Tile({ name, line }: { name: string; line: SpeechLine | null }) {
  const handlers = useSpeechTrigger(line)
  return (
    <li data-testid={name} {...handlers}>
      <button type="button">{name}</button>
      <a href="#more">{`${name} more`}</a>
    </li>
  )
}

function Spoken() {
  return <p data-testid="spoken">{useSpokenLine()?.title ?? ''}</p>
}

function renderSpeech(isEnabled = true) {
  const ui = (enabled: boolean) => (
    <CardmakerSpeechProvider isEnabled={enabled}>
      <ul>
        <Tile name="blood" line={BLOOD} />
        <Tile name="horn" line={HORN} />
        <Tile name="silent" line={null} />
      </ul>
      <button type="button">outside</button>
      <Spoken />
    </CardmakerSpeechProvider>
  )
  const view = render(ui(isEnabled))
  return { ...view, setEnabled: (enabled: boolean) => view.rerender(ui(enabled)) }
}

const spoken = () => screen.getByTestId('spoken').textContent
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
const enter = (name: string, pointerType = 'mouse') =>
  fireEvent.pointerEnter(screen.getByTestId(name), { pointerType })
const leave = (name: string) =>
  fireEvent.pointerLeave(screen.getByTestId(name), { pointerType: 'mouse' })

describe("the Cardmaker's speech", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('speaks after the pointer rests on a tile for a second, and not before', () => {
    renderSpeech()

    enter('blood')
    wait(999)
    expect(spoken()).toBe('')

    wait(1)
    expect(spoken()).toBe('Blood & Battle Mechanic Pack')
  })

  it('says nothing when the pointer leaves before the second is up, and stops when it leaves', () => {
    renderSpeech()

    enter('blood')
    wait(500)
    leave('blood')
    wait(1000)
    expect(spoken()).toBe('')

    enter('blood')
    wait(1000)
    leave('blood')
    expect(spoken()).toBe('')
  })

  it('never speaks for a touch', () => {
    renderSpeech()

    enter('blood', 'touch')
    wait(2000)
    expect(spoken()).toBe('')
  })

  it('speaks for the keyboard focus, and keeps speaking while the focus moves inside the tile', () => {
    renderSpeech()

    act(() => screen.getByRole('button', { name: 'blood' }).focus())
    wait(1000)
    expect(spoken()).toBe('Blood & Battle Mechanic Pack')

    act(() => screen.getByRole('link', { name: 'blood more' }).focus())
    expect(spoken()).toBe('Blood & Battle Mechanic Pack')

    act(() => screen.getByRole('button', { name: 'outside' }).focus())
    expect(spoken()).toBe('')
  })

  it('hides the first line at once on another tile, and speaks the second after its own second', () => {
    renderSpeech()
    enter('blood')
    wait(1000)

    leave('blood')
    enter('horn')
    expect(spoken()).toBe('')

    wait(1000)
    expect(spoken()).toBe('Horn of Plenty Mechanic Pack')
  })

  it('keeps the line when the focus comes to the tile the pointer rests on', () => {
    renderSpeech()
    enter('blood')
    wait(1000)

    act(() => screen.getByRole('button', { name: 'blood' }).focus())
    expect(spoken()).toBe('Blood & Battle Mechanic Pack')
  })

  it('gives no handlers to a tile without a line', () => {
    renderSpeech()

    enter('silent')
    wait(2000)
    expect(spoken()).toBe('')
  })

  it('says nothing while turned off, and stops at once when turned off', () => {
    const { setEnabled } = renderSpeech(false)
    enter('blood')
    wait(2000)
    expect(spoken()).toBe('')

    setEnabled(true)
    enter('horn')
    wait(1000)
    expect(spoken()).toBe('Horn of Plenty Mechanic Pack')

    setEnabled(false)
    expect(spoken()).toBe('')
  })

  it('leaves no pending line behind when the screen goes', () => {
    const { unmount } = renderSpeech()
    enter('blood')

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})

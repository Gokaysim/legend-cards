import { createContext, type FocusEvent, type PointerEvent, useContext, useId } from 'react'

/** What the Cardmaker says about a tile (spec: cardmaker-speech): its name, what it holds, and her own line. */
export type SpeechLine = { title: string; summary: string; speech: string }

/** How long the pointer or the focus rests on a tile before she speaks, as in v2.2.8. */
export const SPEECH_DELAY_MS = 1000

export type CardmakerSpeechValue = {
  /** False where she does not stand in the corner: no tile makes her speak. */
  isEnabled: boolean
  /** The line she says now, or `null`. */
  spoken: SpeechLine | null
  /** A tile, named by `owner`, starts the delay before `line` shows, and hides any other line at once. */
  begin: (owner: string, line: SpeechLine) => void
  /** The tile named by `owner` is left: its line, shown or pending, goes. Another tile's line stays. */
  end: (owner: string) => void
}

export const CardmakerSpeechContext = createContext<CardmakerSpeechValue | null>(null)

/** The handlers that make a tile speak, for the tile's outer element (design D4). */
export type SpeechTriggerHandlers = {
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onBlur?: (event: FocusEvent<HTMLElement>) => void
}

/**
 * Makes a tile speak `line` once the mouse pointer or the keyboard focus has rested on it for `SPEECH_DELAY_MS`
 * (design D4). Spread the handlers on the tile's outer element, not on its button: a disabled button gets no pointer
 * events, but a pack that cannot be opened still speaks, as in v2.2.8. A touch never makes her speak. Outside a
 * `<CardmakerSpeechProvider>`, while it is disabled, or without a line, there are no handlers.
 */
export function useSpeechTrigger(line: SpeechLine | null): SpeechTriggerHandlers {
  const owner = useId()
  const speech = useContext(CardmakerSpeechContext)
  if (speech === null || !speech.isEnabled || line === null) return {}
  return {
    onPointerEnter: (event) => {
      if (event.pointerType !== 'touch') speech.begin(owner, line)
    },
    onPointerLeave: (event) => {
      if (event.pointerType !== 'touch') speech.end(owner)
    },
    onFocus: () => speech.begin(owner, line),
    onBlur: (event) => {
      // Moving the focus inside the tile keeps her speaking.
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
        return
      speech.end(owner)
    },
  }
}

/** The line the Cardmaker says now, for her bubble, or `null`. */
export function useSpokenLine(): SpeechLine | null {
  return useContext(CardmakerSpeechContext)?.spoken ?? null
}

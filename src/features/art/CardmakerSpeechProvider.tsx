import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  CardmakerSpeechContext,
  type CardmakerSpeechValue,
  SPEECH_DELAY_MS,
  type SpeechLine,
} from './cardmakerSpeech'

export type CardmakerSpeechProviderProps = {
  /** True where the Cardmaker stands in the corner (`useWideHover()`): only then do tiles make her speak. */
  isEnabled: boolean
  children: ReactNode
}

/**
 * Holds what the Cardmaker says on one shop screen (spec: cardmaker-speech, design D4): the screen's tiles start and
 * stop her lines through `useSpeechTrigger`, and her corner shows the current one through `useSpokenLine`. It wraps
 * one screen, so a line never outlives its screen. Turning it off hides any line at once.
 */
export function CardmakerSpeechProvider({ isEnabled, children }: CardmakerSpeechProviderProps) {
  const [spoken, setSpoken] = useState<SpeechLine | null>(null)
  /** The tile whose line is pending or shown. */
  const owner = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    owner.current = null
    setSpoken(null)
  }, [])

  const begin = useCallback(
    (next: string, line: SpeechLine) => {
      // Focusing a tile the pointer already rests on does not start it again.
      if (owner.current === next) return
      clear()
      owner.current = next
      timer.current = setTimeout(() => {
        timer.current = null
        setSpoken(line)
      }, SPEECH_DELAY_MS)
    },
    [clear],
  )

  const end = useCallback(
    (leaving: string) => {
      if (owner.current === leaving) clear()
    },
    [clear],
  )

  // Turned off (the window narrowed): any line goes at once, and so does a pending one.
  const [wasEnabled, setWasEnabled] = useState(isEnabled)
  if (wasEnabled !== isEnabled) {
    setWasEnabled(isEnabled)
    if (!isEnabled) setSpoken(null)
  }
  useEffect(() => {
    if (isEnabled) return
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    owner.current = null
  }, [isEnabled])

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const value = useMemo<CardmakerSpeechValue>(
    () => ({ isEnabled, spoken: isEnabled ? spoken : null, begin, end }),
    [isEnabled, spoken, begin, end],
  )
  return <CardmakerSpeechContext value={value}>{children}</CardmakerSpeechContext>
}

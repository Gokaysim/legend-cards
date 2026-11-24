import { useEffect, useRef } from 'react'

import { useDiceDeviceSettings } from '../deviceSettings'
import { unlockAudio } from './audio'
import { prepareNaturalSounds } from './natural'

const GESTURES = ['pointerdown', 'keydown'] as const

/**
 * Wakes the audio on the user's first click, tap or key press anywhere in the app (spec: dice-rolls, "Sound after the
 * first interaction"; design D5 of tune-dice-feel-and-natural-sounds): a browser lets a page play sound only after a
 * gesture. It also loads the natural sounds then, when "Nat 20 / Nat 1 sesi" is on. Mounted once in the app shell.
 */
export function useAudioUnlock(): void {
  const { naturalSound } = useDiceDeviceSettings()
  const naturalRef = useRef(naturalSound)
  useEffect(() => {
    naturalRef.current = naturalSound
  }, [naturalSound])

  useEffect(() => {
    const wake = () => {
      for (const gesture of GESTURES) document.removeEventListener(gesture, wake, true)
      unlockAudio()
      if (naturalRef.current) prepareNaturalSounds()
    }
    for (const gesture of GESTURES) document.addEventListener(gesture, wake, true)
    return () => {
      for (const gesture of GESTURES) document.removeEventListener(gesture, wake, true)
    }
  }, [])
}

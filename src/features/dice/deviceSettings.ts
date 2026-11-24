import { useCallback } from 'react'

import {
  resetDeviceSettingsMemory,
  useDeviceSetting,
  writeDeviceSetting,
} from '@/lib/deviceSetting'

/**
 * The keys of this device's dice settings (design D9), in the device's shared store (`src/lib/deviceSetting.ts`). Keep
 * them stable: they outlive releases.
 */
export const SHOW_ROLLS_KEY = 'lcm.dice.show'
export const SOUND_KEY = 'lcm.dice.sound'
export const SHOW_3D_KEY = 'lcm.dice.3d'
export const NATURAL_SOUND_KEY = 'lcm.dice.natural'
export function lastSeenKey(uid: string): string {
  return `lcm.dice.seen.${uid}`
}

/** Forgets what this tab wrote. For tests, which share the module between cases. */
export { resetDeviceSettingsMemory }

export type DiceDeviceSettings = {
  /** "Atışları göster": other users' rolls open notification cards. On by default. */
  showRolls: boolean
  /** "Zar sesi": the dice make their sounds. Off by default. */
  sound: boolean
  /** "Nat 20 / Nat 1 sesi": the natural sounds play, on every screen. On by default. */
  naturalSound: boolean
  /**
   * "Zarları 3D göster": the strip plays the dice in 3D. On by default. Off, this device shows every roll's dice flat
   * and never loads the 3D part; its own rolls are still thrown with physics (design D5 of dice-formula-and-sixty-dice).
   */
  show3d: boolean
  setShowRolls: (on: boolean) => void
  setSound: (on: boolean) => void
  setNaturalSound: (on: boolean) => void
  setShow3d: (on: boolean) => void
}

/** This device's dice settings (spec: dice-rolls, "Device settings"), live across the app's tabs. */
export function useDiceDeviceSettings(): DiceDeviceSettings {
  const show = useDeviceSetting(SHOW_ROLLS_KEY)
  const sound = useDeviceSetting(SOUND_KEY)
  const show3d = useDeviceSetting(SHOW_3D_KEY)
  const natural = useDeviceSetting(NATURAL_SOUND_KEY)
  const setShowRolls = useCallback(
    (on: boolean) => writeDeviceSetting(SHOW_ROLLS_KEY, on ? '1' : '0'),
    [],
  )
  const setSound = useCallback((on: boolean) => writeDeviceSetting(SOUND_KEY, on ? '1' : '0'), [])
  const setNaturalSound = useCallback(
    (on: boolean) => writeDeviceSetting(NATURAL_SOUND_KEY, on ? '1' : '0'),
    [],
  )
  const setShow3d = useCallback(
    (on: boolean) => writeDeviceSetting(SHOW_3D_KEY, on ? '1' : '0'),
    [],
  )
  return {
    showRolls: show !== '0',
    sound: sound === '1',
    naturalSound: natural !== '0',
    show3d: show3d !== '0',
    setShowRolls,
    setSound,
    setNaturalSound,
    setShow3d,
  }
}

/**
 * When the user last had the Zarlar screen open on this device, in milliseconds, or `null` before the first time
 * (spec: dice-rolls, "Rolls the user has not seen"), and the step that records it.
 */
export function useLastSeen(uid: string | null): {
  lastSeen: number | null
  markSeen: (at: number) => void
} {
  const stored = useDeviceSetting(uid === null ? '' : lastSeenKey(uid))
  const markSeen = useCallback(
    (at: number) => {
      if (uid !== null) writeDeviceSetting(lastSeenKey(uid), String(at))
    },
    [uid],
  )
  const value = uid === null || stored === null ? null : Number(stored)
  return { lastSeen: value !== null && Number.isFinite(value) ? value : null, markSeen }
}

import { useCallback, useSyncExternalStore } from 'react'

/** The keys of this device's dice settings (design D9). Keep them stable: they outlive releases. */
export const SHOW_ROLLS_KEY = 'lcm.dice.show'
export const SOUND_KEY = 'lcm.dice.sound'
export const SHOW_3D_KEY = 'lcm.dice.3d'
export function lastSeenKey(uid: string): string {
  return `lcm.dice.seen.${uid}`
}

/**
 * What this tab wrote, for when the browser refuses storage (a private window, blocked site data): the settings
 * still work until the page closes.
 */
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

function read(key: string): string | null {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) return stored
  } catch {
    // Storage refused: fall back to what this tab wrote.
  }
  return memory.get(key) ?? null
}

function write(key: string, value: string): void {
  memory.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage refused: the memory copy keeps the setting for this tab.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Another tab of the app on this device changed a setting.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function useStored(key: string): string | null {
  return useSyncExternalStore(subscribe, () => read(key))
}

export type DiceDeviceSettings = {
  /** "Atışları göster": other users' rolls open notification cards. On by default. */
  showRolls: boolean
  /** "Zar sesi": the dice make their sounds. Off by default. */
  sound: boolean
  /**
   * "Zarları 3D göster": the strip plays the dice in 3D. On by default. Off, this device shows every roll's dice flat
   * and never loads the 3D part; its own rolls are still thrown with physics (design D5 of dice-formula-and-sixty-dice).
   */
  show3d: boolean
  setShowRolls: (on: boolean) => void
  setSound: (on: boolean) => void
  setShow3d: (on: boolean) => void
}

/** This device's dice settings (spec: dice-rolls, "Device settings"), live across the app's tabs. */
export function useDiceDeviceSettings(): DiceDeviceSettings {
  const show = useStored(SHOW_ROLLS_KEY)
  const sound = useStored(SOUND_KEY)
  const show3d = useStored(SHOW_3D_KEY)
  const setShowRolls = useCallback((on: boolean) => write(SHOW_ROLLS_KEY, on ? '1' : '0'), [])
  const setSound = useCallback((on: boolean) => write(SOUND_KEY, on ? '1' : '0'), [])
  const setShow3d = useCallback((on: boolean) => write(SHOW_3D_KEY, on ? '1' : '0'), [])
  return {
    showRolls: show !== '0',
    sound: sound === '1',
    show3d: show3d !== '0',
    setShowRolls,
    setSound,
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
  const stored = useStored(uid === null ? '' : lastSeenKey(uid))
  const markSeen = useCallback(
    (at: number) => {
      if (uid !== null) write(lastSeenKey(uid), String(at))
    },
    [uid],
  )
  const value = uid === null || stored === null ? null : Number(stored)
  return { lastSeen: value !== null && Number.isFinite(value) ? value : null, markSeen }
}

/** Forgets what this tab wrote. For tests, which share the module between cases. */
export function resetDeviceSettingsMemory(): void {
  memory.clear()
}

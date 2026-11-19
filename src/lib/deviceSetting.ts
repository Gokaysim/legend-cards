import { useCallback, useSyncExternalStore } from 'react'

// This device's settings in `localStorage` (design D9 of dice-channel, shared since design D7 of
// polish-sidebar-mascots-and-lore): the dice settings and the "Oyuncular" list's state. They belong to the device, not
// the account, and never reach Firestore. Keys start with `lcm.` and must stay stable: they outlive releases.

/**
 * What this tab wrote, for when the browser refuses storage (a private window, blocked site data): the settings
 * still work until the page closes.
 */
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

/** The stored value of `key` on this device, or `null` when it was never set. */
export function readDeviceSetting(key: string): string | null {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) return stored
  } catch {
    // Storage refused: fall back to what this tab wrote.
  }
  return memory.get(key) ?? null
}

/** Stores `value` under `key` on this device, and tells every hook that reads it. */
export function writeDeviceSetting(key: string, value: string): void {
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

/** The stored value of `key`, live across the app's components and tabs, or `null` when it was never set. */
export function useDeviceSetting(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readDeviceSetting(key))
}

/** An on/off setting of this device, `fallback` until it is first set, and the step that sets it. */
export function useDeviceFlag(key: string, fallback: boolean): [boolean, (on: boolean) => void] {
  const stored = useDeviceSetting(key)
  const set = useCallback((on: boolean) => writeDeviceSetting(key, on ? '1' : '0'), [key])
  return [stored === null ? fallback : stored === '1', set]
}

/** Forgets what this tab wrote. For tests, which share the module between cases. */
export function resetDeviceSettingsMemory(): void {
  memory.clear()
}

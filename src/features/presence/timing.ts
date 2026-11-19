import type { Presence } from './schema'

// When a device reports its user's presence, and who counts as online (spec: player-presence; design D2 and D4 of
// show-online-players). Pure: the provider wires these to timers, page events and the presence snapshot.

/** How often a reporting device writes its presence. */
export const HEARTBEAT_MS = 2 * 60 * 1000

/** How long a tab off screen goes on reporting after the user last had it on screen. */
export const LOOK_WINDOW_MS = 60 * 60 * 1000

/** How old the latest report may be for its user to count as online. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000

/** The least time between two reports, so quick tab switches and repeated events write once. */
export const BEAT_THROTTLE_MS = 10 * 1000

/** How often the views look again who has gone offline, without new data. */
export const PRESENCE_TICK_MS = 30 * 1000

/** What a device knows when it decides whether to report. Times are the device's clock, in milliseconds. */
export type BeatState = {
  /** The tab is on screen. */
  visible: boolean
  /** The browser reports a network connection. */
  connected: boolean
  /** The user is leaving: the tab is closing, or they are signing out. Nothing is reported until it clears. */
  leaving: boolean
  /** When the user last had the tab on screen. */
  lastLookedAt: number
  /** When this device last reported, or `null` before its first report. */
  lastBeatAt: number | null
}

/** Whether the device should be reporting at `now`: on screen, or within the hour after the last look. */
export function isReporting(state: BeatState, now: number): boolean {
  if (state.leaving || !state.connected) return false
  return state.visible || now - state.lastLookedAt < LOOK_WINDOW_MS
}

/** Whether the device reports at `now`: it should be reporting, and its last report is not too recent. */
export function shouldBeat(state: BeatState, now: number): boolean {
  if (!isReporting(state, now)) return false
  return state.lastBeatAt === null || now - state.lastBeatAt >= BEAT_THROTTLE_MS
}

/**
 * How far the server's clock is ahead of the device's, in milliseconds, measured from a report sent at `sentAt` (device
 * clock) and the server time it was given (`lastSeen`). The report's travel time is in it too, which is far below the
 * online window.
 */
export function clockOffset(sentAt: number, lastSeen: number): number {
  return lastSeen - sentAt
}

/**
 * The uids of the users who count as online at `serverNow` (the device's clock plus `clockOffset`): those whose latest
 * report is at most `ONLINE_WINDOW_MS` old. A pending report (a write of this device the server has not timed yet)
 * counts as now. The signed-in user always counts as online on their own device.
 */
export function onlineUids(
  records: readonly Presence[],
  serverNow: number,
  selfUid: string | null,
): ReadonlySet<string> {
  const online = new Set<string>()
  for (const record of records) {
    if (record.lastSeen === null || serverNow - record.lastSeen.toMillis() <= ONLINE_WINDOW_MS) {
      online.add(record.uid)
    }
  }
  if (selfUid !== null) online.add(selfUid)
  return online
}

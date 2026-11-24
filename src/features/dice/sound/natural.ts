import { firstNaturalMark, type NaturalMark } from '../formula'
import type { DiceRoll } from '../schema'
import { loadSound, playBuffer, unlockAudio } from './audio'
import NAT1_URL from './nat1.m4a?url'
import NAT20_URL from './nat20.m4a?url'

/**
 * The natural sounds (spec: dice-rolls, "Natural sounds"; design D6 of tune-dice-feel-and-natural-sounds): a short
 * sound for a Nat 20 and another for a Nat 1, on every screen. The files are CC0, from OpenGameArt (see
 * THIRD_PARTY_NOTICES.md).
 */

const URLS: Record<NaturalMark, string> = { natural20: NAT20_URL, natural1: NAT1_URL }

/** The natural sounds' volume, from 0 to 1. The files are leveled alike. */
const NATURAL_GAIN = 0.8

/** The fresh rolls whose sound this device has played: each plays at most once. */
const sounded = new Set<string>()

/** Loads both natural sounds, so the first one plays without a delay. */
export function prepareNaturalSounds(): void {
  for (const url of Object.values(URLS)) void loadSound(url)
}

/** Wakes the audio and loads the natural sounds. Call it from a user gesture, such as the setting's switch. */
export function wakeNaturalSounds(): void {
  unlockAudio()
  prepareNaturalSounds()
}

/**
 * A roll's natural mark, its first marked part's for a roll in parts, or `null` for a roll without one or without
 * content (a hidden roll on a player's device).
 */
export function naturalMarkOf(roll: DiceRoll): NaturalMark | null {
  const content = roll.content
  return content ? firstNaturalMark(content.dice, content.mode, content.parts) : null
}

/** Plays a natural's sound, every time it is asked: for "Tekrar izle". */
export function playNatural(mark: NaturalMark): void {
  void loadSound(URLS[mark]).then((buffer) => {
    if (buffer) playBuffer(buffer, NATURAL_GAIN)
  })
}

/**
 * Plays a fresh roll's natural sound, once per roll on this device, when the device's "Nat 20 / Nat 1 sesi" is on
 * (`enabled`). A roll without a natural mark plays nothing. Returns whether it played.
 */
export function playNaturalOnce(roll: DiceRoll, enabled: boolean): boolean {
  if (!enabled || sounded.has(roll.id)) return false
  const mark = naturalMarkOf(roll)
  if (mark === null) return false
  sounded.add(roll.id)
  playNatural(mark)
  return true
}

/** Forgets which rolls have sounded. For tests, which share the module between cases. */
export function resetNaturalSounds(): void {
  sounded.clear()
}

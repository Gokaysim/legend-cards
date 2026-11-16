import { cleanText } from '@/lib/text'

import { COMBAT_LIMITS } from './schema'

/** A group of typed NPCs as "NPC ekle" takes it (spec: initiative-tracker, "Typed NPCs"). */
export type NpcGroup = {
  name: string
  count: number
  modifier: number
}

/** The NPCs' names: the name as typed for one, and the name with a number from 1 for more. */
export function npcNames(name: string, count: number): string[] {
  const base = cleanText(name, COMBAT_LIMITS.name) ?? ''
  if (count <= 1) return [base]
  return Array.from({ length: count }, (_, index) => `${base} ${String(index + 1)}`)
}

/** The group's name in a roll's note: "Goblin 1–4", or the one NPC's name. */
export function groupLabel(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names[0] ?? ''}–${String(names.length)}`
}

/** Whether a typed group is valid: a name of 1 to 40 characters, a count of 1 to 12 and a valid modifier. */
export function isValidNpcGroup(group: NpcGroup): boolean {
  const length = Array.from(group.name.trim()).length
  return (
    length >= 1 &&
    length <= COMBAT_LIMITS.name &&
    Number.isInteger(group.count) &&
    group.count >= 1 &&
    group.count <= COMBAT_LIMITS.npcCount &&
    isValidModifier(group.modifier)
  )
}

/** Whether a modifier is a whole number from −10 to +30 (spec: "The initiative modifier"). */
export function isValidModifier(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= COMBAT_LIMITS.modifierMin &&
    value <= COMBAT_LIMITS.modifierMax
  )
}

/**
 * Reads a typed modifier: an optional sign and whole digits, as "+3", "-2" or "4". Anything else, or a number out of
 * range, is `null`.
 */
export function parseModifier(text: string): number | null {
  const trimmed = text.trim().replace('−', '-')
  if (!/^[+-]?\d{1,3}$/.test(trimmed)) return null
  const value = Number(trimmed)
  return isValidModifier(value) ? value : null
}

/** A modifier as the interface writes it: "+3", "−2", "+0". */
export function formatModifier(value: number): string {
  return value < 0 ? `−${String(-value)}` : `+${String(value)}`
}

/** The message when a group would make a combat larger than 50 (spec: "Typed NPCs"). */
export const TOO_MANY_MESSAGE = `Bir savaşta en fazla ${String(COMBAT_LIMITS.combatants)} katılımcı olabilir.`

/** A typed group in a list: "Goblin ×4 · +1". */
export function npcGroupText(group: NpcGroup): string {
  const count = group.count > 1 ? ` ×${String(group.count)}` : ''
  return `${group.name}${count} · ${formatModifier(group.modifier)}`
}

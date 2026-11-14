import { normalize } from '@/features/cards/text'

import type { CardSet } from './schema'
import { SET_LIMITS } from './schema'

/**
 * The aliases as the form's one field lists them: split at commas, trimmed, empty ones dropped, and each one once
 * (spec: card-sets, "Field limits"). Spellings that compare equal stay apart, as "ragnarok" and "ragnarök" do.
 */
export function parseAliases(text: string): string[] {
  return [...new Set(text.split(',').map((part) => part.trim()))].filter((alias) => alias !== '')
}

/** What the set form checks. `id` is the set's own, or `null` for a new one. */
export type SetFormInput = { id: string | null; code: string; name: string; aliases: string[] }

/**
 * The problems that block a save, in Turkish (spec: card-sets, "Distinct codes, names and aliases", "Field limits",
 * "Stored sets"): an empty, too long or "Blessed" code, an empty or too long name, too many or too long aliases, and a
 * code, name or alias that another set already has, compared ignoring case, accents, spaces and punctuation. The rules
 * cannot query, so these checks are the form's.
 */
export function setFormProblems(input: SetFormInput, sets: readonly CardSet[]): string[] {
  const others = sets.filter((set) => set.id !== input.id)
  const codeKey = normalize(input.code)
  const otherSpellings = new Set(others.flatMap((set) => [set.code, ...set.aliases].map(normalize)))
  const otherNames = new Set(others.map((set) => normalize(set.name)))
  const problems: string[] = []

  if (input.code === '') problems.push('Set kodu boş olamaz.')
  else if (codeKey === '') problems.push('Set kodunda en az bir harf ya da rakam olmalı.')
  else if (codeKey === 'blessed') problems.push('“Blessed” bir set değil: başka bir kod seç.')
  else if (input.id === null && otherSpellings.has(codeKey)) {
    problems.push('Bu kodla bir set zaten var.')
  }
  if (input.code.length > SET_LIMITS.code) {
    problems.push(`Set kodu en fazla ${SET_LIMITS.code} karakter olabilir.`)
  }

  if (input.name === '') problems.push('Set adı boş olamaz.')
  else if (otherNames.has(normalize(input.name))) problems.push('Bu adla bir set zaten var.')
  if (input.name.length > SET_LIMITS.name) {
    problems.push(`Set adı en fazla ${SET_LIMITS.name} karakter olabilir.`)
  }

  if (input.aliases.length > SET_LIMITS.aliases) {
    problems.push(`Bir setin en fazla ${SET_LIMITS.aliases} alias'ı olabilir.`)
  }
  if (input.aliases.some((alias) => alias.length > SET_LIMITS.alias)) {
    problems.push(`Bir alias en fazla ${SET_LIMITS.alias} karakter olabilir.`)
  }
  const taken = input.aliases.filter((alias) => otherSpellings.has(normalize(alias)))
  if (taken.length > 0) {
    problems.push(`Başka bir set bu yazımı kullanıyor: ${taken.join(', ')}.`)
  }
  return problems
}

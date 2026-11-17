/**
 * Why the app treats a signed-in account as not on the access list, for the diagnostic line on the "ekli değil" screen
 * (spec: user-auth, "Diagnosing the 'ekli değil' decision"; design D1, D4 of diagnose-no-access).
 * - `noEmail`: the account has no email address
 * - `unverified`: the account's address is not verified, so the app does not read the list
 * - `serverMissing`: the own-entry subscription answered, not from the cache, that there is no entry
 */
export type AccessDiagnosisReason = 'noEmail' | 'unverified' | 'serverMissing'

/** The result of reading the own entry once, straight from the server. */
export type ServerRead = 'pending' | 'exists' | 'missing' | 'skipped' | `error:${string}`

export type AccessDiagnosis = {
  reason: AccessDiagnosisReason
  /** The exact entry ID the app looked up, or `null` when it looked up none. */
  entryId: string | null
  serverRead: ServerRead
  buildId: string
}

const REASON_LABELS: Record<AccessDiagnosisReason, string> = {
  noEmail: 'e-posta yok',
  unverified: 'e-posta doğrulanmamış',
  serverMissing: 'abonelik: kayıt yok',
}

function serverReadLabel(read: ServerRead): string {
  switch (read) {
    case 'pending':
      return 'kontrol ediliyor'
    case 'exists':
      return 'var'
    case 'missing':
      return 'yok'
    case 'skipped':
      return 'yapılmadı'
    default:
      return `hata (${read.slice('error:'.length)})`
  }
}

/** The diagnostic line, in Turkish. The entry ID is quoted, so a stray space or character shows. */
export function diagnosisLine(diagnosis: AccessDiagnosis): string {
  const entry = diagnosis.entryId === null ? '—' : `"${diagnosis.entryId}"`
  return [
    `Teşhis: ${REASON_LABELS[diagnosis.reason]}`,
    `kayıt: ${entry}`,
    `sunucu: ${serverReadLabel(diagnosis.serverRead)}`,
    `build ${diagnosis.buildId}`,
  ].join(' · ')
}

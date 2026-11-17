import { describe, expect, it } from 'vitest'

import { type AccessDiagnosis, diagnosisLine } from './accessDiagnosis'

// Spec: user-auth, "Diagnosing the 'ekli değil' decision" (design D4 of diagnose-no-access).

const base: AccessDiagnosis = {
  reason: 'serverMissing',
  entryId: 'cem@gmail.com',
  serverRead: 'missing',
  buildId: 'abc1234',
}

describe('diagnosisLine', () => {
  it('names the reason, the quoted entry ID, the server read and the build', () => {
    expect(diagnosisLine(base)).toBe(
      'Teşhis: abonelik: kayıt yok · kayıt: "cem@gmail.com" · sunucu: yok · build abc1234',
    )
  })

  it('names each reason', () => {
    expect(
      diagnosisLine({ ...base, reason: 'noEmail', entryId: null, serverRead: 'skipped' }),
    ).toBe('Teşhis: e-posta yok · kayıt: — · sunucu: yapılmadı · build abc1234')
    expect(
      diagnosisLine({ ...base, reason: 'unverified', entryId: null, serverRead: 'skipped' }),
    ).toBe('Teşhis: e-posta doğrulanmamış · kayıt: — · sunucu: yapılmadı · build abc1234')
  })

  it('names each server read', () => {
    expect(diagnosisLine({ ...base, serverRead: 'pending' })).toContain('sunucu: kontrol ediliyor')
    expect(diagnosisLine({ ...base, serverRead: 'exists' })).toContain('sunucu: var')
    expect(diagnosisLine({ ...base, serverRead: 'error:permission-denied' })).toContain(
      'sunucu: hata (permission-denied)',
    )
  })

  it('shows a stray space in the entry ID', () => {
    expect(diagnosisLine({ ...base, entryId: 'cem@gmail.com ' })).toContain(
      'kayıt: "cem@gmail.com "',
    )
  })
})

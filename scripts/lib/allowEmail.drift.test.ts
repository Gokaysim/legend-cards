// @vitest-environment node
// Scripts do not import app code, so the access-list address check exists three times: here in `allowEmail.ts`, in
// src/features/access/email.ts, and in `validEmailId()` in firestore.rules. This test fails when they disagree.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  EMAIL_MAX as APP_EMAIL_MAX,
  EMAIL_PATTERN as APP_EMAIL_PATTERN,
  normalizeEmail as appNormalizeEmail,
} from '../../src/features/access/email.ts'
import { EMAIL_MAX, EMAIL_PATTERN, isValidEmail, normalizeEmail } from './allowEmail.ts'
import { messages } from './messages.ts'

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

describe('the access-list address check', () => {
  it('is the same in the script and the app', () => {
    expect(EMAIL_PATTERN.source).toBe(APP_EMAIL_PATTERN.source)
    expect(EMAIL_MAX).toBe(APP_EMAIL_MAX)
    for (const value of ['  Ayla@Gmail.COM ', 'İlker@example.com', '']) {
      expect(normalizeEmail(value), value).toBe(appNormalizeEmail(value))
    }
  })

  it('is the same in the Firestore rules', () => {
    // The rules match the whole string, so their pattern is the script's without the anchors.
    const unanchored = EMAIL_PATTERN.source.replace(/^\^/, '').replace(/\$$/, '')
    expect(rules).toContain(`email.size() <= ${EMAIL_MAX} && email.matches('${unanchored}')`)
  })

  it('accepts a plain address and refuses a malformed one', () => {
    expect(isValidEmail('dm@gmail.com')).toBe(true)
    expect(isValidEmail('dm.gmail.com')).toBe(false)
    expect(isValidEmail('DM@gmail.com')).toBe(false)
  })
})

describe('the role script', () => {
  it('names the access list when an account has no profile yet', () => {
    expect(messages.noProfile('dm@gmail.com')).toContain('npm run allow-email')
  })
})

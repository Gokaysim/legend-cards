import { describe, expect, it } from 'vitest'

describe('test setup', () => {
  it('injects the package version as a semver string', () => {
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/)
  })
})
